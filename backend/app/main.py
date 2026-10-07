"""
Main FastAPI Application Entrypoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router

app = FastAPI(
    title="SemantiCare API • HL7 v2 to FHIR R4 Semantic Mapper",
    description="Backend engine for parsing HL7 v2, zero-trust PHI redaction, ontology grounding, and semantic translation to FHIR R4.",
    version="1.0.0",
)

# Enable CORS for local Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "message": "HL7 v2 to FHIR R4 Semantic Mapper Engine is running.",
        "docs_url": "/docs",
        "api_prefix": "/api",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
