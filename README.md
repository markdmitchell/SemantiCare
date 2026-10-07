# SemantiCare

SynapseHL7: A healthcare developer and clinical informaticist workbench designed to ingest legacy HL7 v2 clinical messages (ADT, ORU, MDM), parse them hierarchically, scrub protected health information (PHI) via a zero-trust reversible token vault, ground clinical terminology to standard LOINC/UCUM ontologies, translate to valid FHIR R4 bundles, surface semantic ambiguities through an interactive Human-in-the-Loop (HITL) resolution deck, and validate conformance against US Core 3.1.1 specifications.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/45ae415c-470b-410e-907c-e482c0a97595).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
