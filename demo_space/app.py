import io
import gradio as gr
import requests
from PIL import Image

BACKEND_URL = "https://firstoff-animalmind-backend.hf.space/classify-image"

def classify_image(img):
    if img is None:
        return "⚠️ Nenhuma imagem fornecida", "", 0.0, "0 ms"
    
    # Convert PIL Image to JPEG bytes
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()
    
    try:
        files = {"file": ("image.jpg", img_bytes, "image/jpeg")}
        response = requests.post(BACKEND_URL, files=files, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            species = data.get("species", "unknown")
            breed = data.get("breed", "unknown")
            confidence = data.get("confidence", 0.0)
            processing_time = data.get("processing_time_ms", 0.0)
            
            # Format species
            if species.lower() == "dog":
                species_display = "🐶 Cão (Dog)"
            elif species.lower() == "cat":
                species_display = "🐱 Gato (Cat)"
            else:
                species_display = f"❓ Desconhecido ({species})"
            
            # Format breed
            breed_display = breed.title()
            
            # Confidence slider value (0 to 100)
            confidence_pct = float(confidence) * 100.0
            
            time_display = f"{processing_time:.1f} ms"
            
            return species_display, breed_display, confidence_pct, time_display
            
        elif response.status_code == 415:
            return "⚠️ Formato não suportado. Usa JPG/PNG.", "", 0.0, "0 ms"
        else:
            return f"⚠️ Erro do servidor (Código {response.status_code})", "", 0.0, "0 ms"
            
    except requests.exceptions.RequestException as e:
        return "⚠️ Servidor offline ou ligação falhou", "", 0.0, "0 ms"

# Custom CSS for a beautiful dark theme look
custom_css = """
body, .gradio-container {
    background-color: #0A0A0B !important;
    color: #E4E4E7 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.gr-button-primary {
    background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
    border: none !important;
    color: white !important;
    font-weight: 600 !important;
}
.gr-button-primary:hover {
    filter: brightness(1.1) !important;
}
.gr-block, .gr-box {
    background-color: #111113 !important;
    border: 1px solid #27272A !important;
    border-radius: 12px !important;
}
.gr-input, .gr-input:focus {
    background-color: #18181B !important;
    border-color: #3F3F46 !important;
    color: white !important;
}
"""

# Build interface
with gr.Blocks(css=custom_css, title="AnimalMind - Demo Pública") as demo:
    gr.HTML(
        """
        <div style="text-align: center; margin-bottom: 2rem; margin-top: 1rem;">
            <h1 style="font-size: 2.5rem; font-weight: 800; color: #10B981; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                AnimalMind 🐾
            </h1>
            <p style="font-size: 1.1rem; color: #A1A1AA; max-width: 600px; margin: 0 auto;">
                Identifica a raça e espécie do teu cão ou gato instantaneamente a partir de uma foto usando inteligência artificial.
            </p>
        </div>
        """
    )
    
    with gr.Row():
        with gr.Column(scale=1):
            input_image = gr.Image(type="pil", label="Carrega a foto do teu pet")
            analyze_btn = gr.Button("Analisar 🔍", variant="primary")
            
        with gr.Column(scale=1):
            output_species = gr.Textbox(label="Espécie Detetada", interactive=False)
            output_breed = gr.Textbox(label="Raça Identificada", interactive=False)
            output_conf = gr.Slider(label="Confiança (%)", minimum=0, maximum=100, value=0, interactive=False)
            output_time = gr.Textbox(label="Tempo de Processamento", interactive=False)
            
    analyze_btn.click(
        fn=classify_image,
        inputs=input_image,
        outputs=[output_species, output_breed, output_conf, output_time]
    )
    
    # Preloaded examples
    gr.Examples(
        examples=[
            "examples/golden.png",
            "examples/siamese.png",
            "examples/bulldog.png",
            "examples/persian.png"
        ],
        inputs=input_image,
        outputs=[output_species, output_breed, output_conf, output_time],
        fn=classify_image,
        cache_examples=False
    )

if __name__ == "__main__":
    demo.launch()
