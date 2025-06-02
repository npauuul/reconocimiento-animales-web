// Asegúrate de que JSZip esté disponible globalmente antes de este script
// Si usas módulos, puedes importar JSZip así:
// import JSZip from 'jszip';
// Si usas un script en HTML, añade esto en tu HTML antes de este archivo:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

const fileInput = document.getElementById('file-upload');
const previewContainer = document.getElementById('preview-container');
const previewPlaceholder = document.getElementById('preview-placeholder');
const clearBtn = document.getElementById('clear-btn');

function updatePreview() {
    previewContainer.innerHTML = '';
    if (fileInput.files.length === 0) {
        previewContainer.appendChild(previewPlaceholder);
        previewPlaceholder.style.display = 'block';
        return;
    }
    previewPlaceholder.style.display = 'none';
    Array.from(fileInput.files).forEach((file, idx) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = "relative m-2";
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = "object-contain h-24 w-24 rounded shadow border";
                // Remove button
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = 'x';
                removeBtn.className = "absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-800";
                removeBtn.onclick = function () {
                    removeImage(idx);
                };
                imgWrapper.appendChild(img);
                imgWrapper.appendChild(removeBtn);
                previewContainer.appendChild(imgWrapper);
            };
            reader.readAsDataURL(file);
        }
    });
}

function removeImage(index) {
    const dt = new DataTransfer();
    Array.from(fileInput.files).forEach((file, idx) => {
        if (idx !== index) dt.items.add(file);
    });
    fileInput.files = dt.files;
    updatePreview();
}

fileInput.addEventListener('change', updatePreview);

clearBtn.addEventListener('click', function () {
    fileInput.value = '';
    updatePreview();
});

// Drag & drop support
const dropArea = fileInput.parentElement;
dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('ring', 'ring-blue-400');
});
dropArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropArea.classList.remove('ring', 'ring-blue-400');
});
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('ring', 'ring-blue-400');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const dt = new DataTransfer();
        Array.from(fileInput.files).forEach(f => dt.items.add(f));
        Array.from(files).forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
        updatePreview();
    }
});

updatePreview();


const URL = "https://teachablemachine.withgoogle.com/models/tazWB9H0o/";

let model, maxPredictions;

// Cargar el modelo al iniciar la página
async function loadModel() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
}
loadModel();

// Procesar imágenes subidas y descargar ZIP clasificado
document.getElementById('upload-btn').addEventListener('click', async function () {
    if (!model) {
        alert("El modelo aún no está cargado. Espera un momento e inténtalo de nuevo.");
        return;
    }
    const files = fileInput.files;
    if (!files.length) {
        alert("Selecciona al menos una imagen.");
        return;
    }
    // Limpiar predicciones anteriores
    document.querySelectorAll('.prediction-result').forEach(e => e.remove());

    // Crear ZIP
    const zip = new JSZip();

    // Procesar cada imagen
    let procesadas = 0;
    Array.from(files).forEach((file, idx) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.src = e.target.result;
                img.onload = async function () {
                    // Predecir usando el modelo
                    const prediction = await model.predict(img);
                    // Obtener la clase con mayor probabilidad
                    const best = prediction.reduce((a, b) => a.probability > b.probability ? a : b);
                    const className = best.className.replace(/[\/\\:*?"<>|]/g, "_");

                    // Añadir imagen al ZIP en la carpeta correspondiente
                    zip.folder(className).file(file.name, e.target.result.split(',')[1], { base64: true });

                    // Mostrar resultado en la interfaz
                    const resultDiv = document.createElement('div');
                    resultDiv.className = 'prediction-result text-xs mt-1 text-blue-900 bg-blue-100 rounded p-1';
                    resultDiv.style.maxWidth = '6rem';
                    const imgWrappers = previewContainer.querySelectorAll('.relative.m-2');
                    if (imgWrappers[idx]) {
                        imgWrappers[idx].appendChild(resultDiv);
                    }

                    // Cuando todas las imágenes estén procesadas, descargar el ZIP
                    procesadas++;
                    if (procesadas === files.length) {
                        zip.generateAsync({ type: "blob" }).then(function (content) {
                            saveAs(content, "imagenes_clasificadas.zip");
                        });
                    }
                };
            };
            reader.readAsDataURL(file);
        } else {
            // Si no es imagen, contar igualmente para no bloquear el ZIP
            procesadas++;
        }
    });
});