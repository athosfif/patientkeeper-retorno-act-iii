# Presentation R13 / Video R08 · Application R12

The existing LabLab submission was updated successfully and its public page reloaded. Current submitted media are **PDF R13 (nine pages), video R08 and cover R10**. The public PDF and video returned HTTP200 over verified TLS and matched the final exports by full SHA-256. See the [sanitized LabLab delivery receipt](FINAL-DELIVERY-R13.json). This records the platform update; GitHub publication is verified separately.

[LabLab project](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/figueira-ai/patientkeeper-retorno) · [Submitted PDF R13](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/presentation/presentation_wbbq4gjv0rqcvhuppo8ud6h7.pdf) · [Submitted video R08](https://storage.googleapis.com/lablab-video-submissions/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/video/video_jincpatvkbrlzyqnp3w7njsh.mp4)

## Current files

- [Presentation PDF R13](PRESENTATION-EN-R13.pdf) and [editable presentation R13](PRESENTATION-EN-R13.pptx): nine pages/slides. The additional value slide separates a conditional planning scenario from an anonymous report about a different tool.
- [Edited video R08](VIDEO-EN-R08.mp4): 191.843 seconds, 1920×1080, 30 fps. A qualified scenario card replaces only the relevant picture interval; the original five Benjamin narration parts, spoken wording and subtitle timing are preserved.
- [English subtitles R08](SUBTITLES-EN-R08.srt): the same approved text and timing as R07.
- [Narration transcript R08](NARRATION-EN-R08.txt): the wording actually retained in the published video, unchanged from R07. A requested replacement voice segment was not generated and is not in the published audio. No raw narration audio is included.
- [Cover R10](COVER-R10.png): the approved FIGUEIRA conceptual desk-calendar cover, unchanged.

## Conditional value scenario

**6 records/day × (15 reported manual minutes − 10 assumed assisted minutes) = 30 minutes/day, if that assisted total is achieved.** The reported manual workload is 90 minutes/day. The ten assisted minutes are our illustrative assumption and include preparation, doctor review, corrections and overhead. This is not a benchmark, promised saving or PatientKeeper result. ASR and note work are not counted twice, and model latency is not presented as doctor time saved.

Separately, the PDF includes an anonymous, informal physician report of about two hours/day saved using another consultation transcription tool. That report was shared with the team, is not independently verified and is not a PatientKeeper outcome. PatientKeeper operational savings and clinical outcomes remain unmeasured.

Current local ASR handles short fictional dictation up to 120 seconds. The care note copies selected literal segments for review; it is not a generated clinical summary or signed medical record. Static Pages cannot transcribe audio. The scenario does not demonstrate complete long-consultation transcription.

## Preserved implementation and evidence

Application/site remain R12. Functional code was validated at `22df95368a5f6dc340c627e5244ffc781fef2dae` with 284 passing tests. Pages remains `3bf87f772237f001220fe221a85c715c5d0e29c0`. This update changes presentation/video materials and metadata only; it introduces no model execution, deployment or patient action.

The five recorded AMD Token Factory administrative calls produced three candidates, one abstention and one timeout. The public panel is a context-checked replay, with no live inference. Official usage links the exact requested/used service identifiers; physical GPU hardware, model weights and checkpoint revision were not independently inspected. Google award eligibility remains unconfirmed. Local CPU transcription and the doctor note are separate from those five Gemma calls.

WhatsApp contacts, responses and professional review remain simulations. Surgical clinical protocols remain pending. No real patient message, booking or signed record is produced.

## History and rights

[Previous R12 presentation/R07 video delivery](RELEASE-R12.md) and its [receipt](FINAL-DELIVERY-R12.json) are retained as historical records. October 5 administrative scaffolding remains disclosed; AI/source-review work was added during the event. Own code is MIT, which does not relicense models, provider outputs, narration, finished video, fonts or brand assets. The edited presentation is supplied as the authorised project material, without independent reuse rights to third-party narration.

No patient data, complete medical PDFs, raw audio, private account observations, credentials, model weights or font binaries are included. See the [source README](../../README.md) for current limits and reproduction.
