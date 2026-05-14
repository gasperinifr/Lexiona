import io
import pdfplumber
from docx import Document
from groq import AsyncGroq
from app.config import settings

client = AsyncGroq(api_key=settings.groq_api_key)


def extrair_texto_pdf(conteudo: bytes) -> str:
    """Extrai texto de um PDF usando pdfplumber."""
    texto_total = []
    with pdfplumber.open(io.BytesIO(conteudo)) as pdf:
        for page in pdf.pages:
            texto = page.extract_text()
            if texto:
                texto_total.append(texto)
    return "\n\n".join(texto_total)


def extrair_texto_docx(conteudo: bytes) -> str:
    """Extrai texto de um arquivo DOCX."""
    doc = Document(io.BytesIO(conteudo))
    paragrafos = [p.text for p in doc.paragraphs if p.text.strip()]

    # Incluir tabelas
    for tabela in doc.tables:
        for linha in tabela.rows:
            celulas = [cel.text.strip() for cel in linha.cells if cel.text.strip()]
            if celulas:
                paragrafos.append(" | ".join(celulas))

    return "\n".join(paragrafos)


async def transcrever_audio(conteudo: bytes, filename: str) -> str:
    """Transcreve áudio usando Groq Whisper."""
    # Determinar tipo MIME
    ext = filename.lower().split(".")[-1] if "." in filename else "webm"
    tipos = {
        "mp3": "audio/mpeg",
        "mp4": "audio/mp4",
        "wav": "audio/wav",
        "webm": "audio/webm",
        "ogg": "audio/ogg",
        "m4a": "audio/m4a",
    }
    mime = tipos.get(ext, "audio/webm")

    transcricao = await client.audio.transcriptions.create(
        file=(filename, io.BytesIO(conteudo), mime),
        model="whisper-large-v3",
        language="pt",
        response_format="text",
    )

    return transcricao if isinstance(transcricao, str) else transcricao.text