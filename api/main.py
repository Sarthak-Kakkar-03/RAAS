from fastapi import FastAPI, UploadFile, File, HTTPException
from pathlib import Path
import shutil

DATA_DIR = Path("data")
RAW_DIR = DATA_DIR / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Initialize fast api app
# Skeleton for now
app = FastAPI()

@app.get("/health")
def health():
    return {
        "status": "ok"
    }
    
@app.post("/retrieve")    
def retrieve(query: dict):
    return {
        "results":
            [
                {"text": "placeholder chunk", 
                 "score": 0.9}
            ]
    }
    
@app.post("/files/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    safe_name = Path(file.filename).name
    if safe_name in {"", ".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid filename")
    out_path = RAW_DIR / safe_name
    with out_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"filename": file.filename, "saved_to": str(out_path)}