#!/usr/bin/env python3
"""Read-only, offline verification of the explicit container runtime inputs."""
import hashlib
import json
import posixpath
import re
import stat
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
EVOLUS_RUNTIME = frozenset('integration/evolus-pilot/' + name for name in (
    'preparation.mjs', 'rest-client.mjs', 'runtime-pilot.mjs', 'http-api.mjs'))
CONTEXT_DIRECTORIES = ('app', 'docs', 'integration', 'integration/evolus-pilot')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def relative_imports(text):
    """Restricted source inspection, including literal dynamic imports.

    A computed dynamic import needs a separate reviewed packaging rule. Refuse it
    instead of silently declaring an incomplete runtime context valid.
    """
    static = re.findall(r"(?:\bfrom\s*|\bimport\s*)['\"](\.[^'\"]+)['\"]", text)
    calls = list(re.finditer(r'\bimport\s*\(', text))
    dynamic = list(re.finditer(r"\bimport\s*\(\s*(['\"])([^'\"]+)\1\s*\)", text))
    require({match.start() for match in calls} == {match.start() for match in dynamic},
            'Dynamic imports must be explicit string literals')
    for match in dynamic:
        require(match.group(2).startswith(('.', 'node:')), 'Unexpected dynamic import origin')
    return [('static', value) for value in static] + [
        ('dynamic', match.group(2)) for match in dynamic if match.group(2).startswith('.')]


def verify():
    dockerfile = (HERE / 'Dockerfile').read_text(encoding='utf-8')
    ignore = (HERE / 'Dockerfile.dockerignore').read_text(encoding='utf-8')
    base_match = re.search(r'^ARG RETORNO_NODE_IMAGE=(\S+)$', dockerfile, re.M)
    require(base_match is not None, 'Explicit Node base image argument missing')
    base_image = base_match.group(1)
    require(re.fullmatch(r'node:24-bookworm-slim(?:@sha256:[a-f0-9]{64})?', base_image),
            'Only the reviewed official Node 24 Debian slim base is permitted')
    inputs = []
    for line in dockerfile.splitlines():
        if not line.startswith('COPY '):
            continue
        values = json.loads(line[5:])
        require(isinstance(values, list) and len(values) >= 2, 'COPY must be a JSON array')
        destination = values[-1]
        require(destination in ('./', './app/', './docs/', './integration/evolus-pilot/'), 'Unexpected COPY destination')
        for value in values[:-1]:
            require(isinstance(value, str) and value == posixpath.normpath(value), 'Invalid COPY input')
            require(not value.startswith(('/', '.')) and not any(c in value for c in '*?['), 'Non-explicit COPY')
            require('..' not in Path(value).parts, 'COPY traversal')
            expected = './integration/evolus-pilot/' if value.startswith('integration/evolus-pilot/') else (
                './app/' if value.startswith('app/') else './docs/' if value.startswith('docs/') else './')
            require(destination == expected, 'COPY would flatten a file into the wrong directory')
            inputs.append(value)
    require(len(inputs) == len(set(inputs)), 'Duplicate COPY input')
    names = set(inputs)
    require({name for name in names if name.startswith('integration/')} == EVOLUS_RUNTIME,
            'Only the four named Evolus runtime modules may be copied')
    rules = [line.strip() for line in ignore.splitlines() if line.strip() and not line.startswith('#')]
    require(rules and rules[0] == '**', 'Ignore must deny the full context first')
    allowed = set()
    for rule in rules[1:]:
        if rule in tuple(directory + '/**' for directory in CONTEXT_DIRECTORIES):
            continue
        require(rule.startswith('!') and not any(c in rule[1:] for c in '*?['), 'Only exact allow exceptions are permitted')
        value = rule[1:]
        require(value in tuple(directory + '/' for directory in CONTEXT_DIRECTORIES) or value in names,
                'Ignore contains an extra input')
        if not value.endswith('/'):
            allowed.add(value)
    for directory in CONTEXT_DIRECTORIES:
        require(rules.index('!' + directory + '/') + 1 == rules.index(directory + '/**'),
                'Each allowed parent must immediately re-exclude its contents')
        require(all(rules.index('!' + name) > rules.index(directory + '/**')
                    for name in names if name.startswith(directory + '/')),
                'File exception must follow the directory exclusion')
        parent = posixpath.dirname(directory)
        if parent:
            require(rules.index('!' + directory + '/') > rules.index(parent + '/**'),
                    'Nested directory must be restored after its parent exclusion')
    require(allowed == names, 'Docker COPY and context allowlist differ')
    require({'CASOS-SINTETICOS.json', 'LICENSE', 'app/server.mjs', 'docs/recorded-gemma-runs.json'} <= names,
            'Required runtime input missing')

    manifest = []
    imports = []
    for name in sorted(names):
        source = ROOT / name
        require(source.is_file() and not source.is_symlink(), 'Runtime input missing or symlink: ' + name)
        require(source.resolve().is_relative_to(ROOT), 'Runtime path escapes project')
        require(source.stat().st_mode & stat.S_IROTH, 'Copied input would not be readable by the node user: ' + name)
        require(not any(part in ('data', 'assets', 'evidence', 'node_modules', '.git', '__pycache__')
                        or part.startswith('.env') for part in Path(name).parts), 'Excluded runtime path')
        raw = source.read_bytes()
        if name.endswith(('.mjs', '.js')):
            for kind, relative in relative_imports(raw.decode('utf-8')):
                dependency = posixpath.normpath(posixpath.join(posixpath.dirname(name), relative))
                require(dependency in names, 'Missing relative import: ' + dependency)
                imports.append({'from': name, 'to': dependency, 'kind': kind})
        manifest.append({'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})

    server = (ROOT / 'app/server.mjs').read_text(encoding='utf-8')
    static_block = server.split('const STATIC_FILES = new Map([', 1)[1].split(']);', 1)[0]
    routes = {}
    for route, relative in re.findall(r"\['(/[^']*)', \['([^']+)'", static_block):
        asset = posixpath.normpath('app/' + relative)
        require(asset in names, 'Missing served asset: ' + asset)
        routes[route] = asset
    html = (ROOT / 'app/index.html').read_text(encoding='utf-8')
    for asset in re.findall(r'(?:src|href)="(/[^"?#]*)"', html):
        if asset not in ('/', '/api/export'):
            require(asset in routes, 'HTML resource is not served: ' + asset)
    require("host = '127.0.0.1'" in server and "!['127.0.0.1', '::1'].includes(host)" in server,
            'Existing loopback-only server contract changed')
    require("'LOCAL_HOST_REQUIRED'" in server and "'SAME_ORIGIN_REQUIRED'" in server,
            'Existing local request guards missing')
    require(all(flag + '=0' in dockerfile for flag in (
        'RETORNO_MODEL_ENABLED', 'RETORNO_VOICE_ENABLED', 'RETORNO_EVOLUS_ENABLED')),
        'Model, voice and Evolus must be disabled by default')
    require('USER node' in dockerfile and 'RETORNO_DATA_DIR=/tmp/retorno-data' in dockerfile,
            'Non-root temporary-data configuration missing')
    require(not re.search(r'^\s*(ADD|RUN|EXPOSE|VOLUME)\b', dockerfile, re.M),
            'Unexpected build/runtime instruction')
    require('API_KEY=' not in dockerfile, 'Credential must not be baked into the image')
    return {
        'schemaVersion': 2,
        'checkedAtUtc': datetime.now(timezone.utc).isoformat(),
        'state': 'static_context_verified',
        'scope': 'this_offline_source_check_only_not_a_runtime_assessment',
        'staticContextVerified': True,
        'dockerInvoked': False,
        'imagePulled': False,
        'imageBuilt': False,
        'containerRun': False,
        'modelCalls': 0,
        'voiceEnabled': False,
        'evolusEnabled': False,
        'evolusRuntimePackaged': sorted(EVOLUS_RUNTIME),
        'runtimeTarget': 'local Linux Docker Engine; host network; existing loopback-only server',
        'baseImage': base_image,
        'baseDigestPinned': '@sha256:' in base_image,
        'baseDigestVerified': False,
        'inputCount': len(manifest),
        'totalInputBytes': sum(item['bytes'] for item in manifest),
        'dockerfileSha256': hashlib.sha256(dockerfile.encode()).hexdigest(),
        'ignoreSha256': hashlib.sha256(ignore.encode()).hexdigest(),
        'verifierSha256': hashlib.sha256((HERE / 'verify_context.py').read_bytes()).hexdigest(),
        'readmeSha256': hashlib.sha256((HERE / 'README.md').read_bytes()).hexdigest(),
        'relativeImports': imports,
        'dynamicImportCount': sum(item['kind'] == 'dynamic' for item in imports),
        'inputs': manifest,
        'limitations': [
            'Static inspection does not verify Docker parsing, image availability or runtime behavior.',
            'Optional Evolus client modules are packaged, disabled; no Evolus/AMD model server or credential is included.',
            'Voice worker, Python runtime and weights are excluded; voice stays disabled.',
            'No prize eligibility is established by this package.',
        ],
    }


if __name__ == '__main__':
    try:
        print(json.dumps(verify(), indent=2, ensure_ascii=False))
    except (ValueError, OSError, IndexError, json.JSONDecodeError) as error:
        raise SystemExit('CONTEXT_CHECK_FAILED: ' + str(error))
