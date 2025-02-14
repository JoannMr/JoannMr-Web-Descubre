document.addEventListener("DOMContentLoaded", () => {
    const ccaaSelect = document.getElementById("ccaa");
    const provinciaSelect = document.getElementById("provincia");
    const poblacionSelect = document.getElementById("poblacion");
    const form = document.getElementById("search-form");
    const populationInfo = document.getElementById("population-info");
    const weatherInfo = document.getElementById("weather-info");
    const imageContainer = document.getElementById("image-container");
    const mapContainer = document.getElementById("map-container");

    // Modal
    const infoButton = document.getElementById("info-button");
    const modal = document.getElementById("info-modal");
    const closeButton = document.querySelector(".close");

    // Abrimos el modal
    infoButton.addEventListener("click", () => {
        modal.style.display = "block";
    });

    // Cerramos el modal
    closeButton.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Cerramos el modal al hacer clic fuera del contenido
    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Web Speech API: API NAVEGADOR
    const voiceSearchButton = document.createElement("button");
    voiceSearchButton.textContent = "🎙️ Buscar por voz";
    voiceSearchButton.id = "voice-search-button";
    form.appendChild(voiceSearchButton);

    voiceSearchButton.addEventListener("click", (event) => {
        event.preventDefault();
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "es-ES";

        function normalizeText(text) {
            // Eliminamos acentos y caracteres especiales
            let normalizedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
            // Eliminar comas, puntos y otros caracteres especiales
            normalizedText = normalizedText.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        
            return normalizedText;
        }

        function reconocerTexto(mensaje, callback) {
            const synth = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(mensaje);
            
            utterance.onend = () => { 
                recognition.start();
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                console.log(`Texto reconocido (${mensaje}):`, transcript);
                callback(transcript);
            };

            synth.speak(utterance);
        }

        // Paso 1: Pedimos la comunidad autónoma
        reconocerTexto("Di el nombre de la comunidad autónoma", (ccaaTexto) => {
            let selectedCCAA = Array.from(ccaaSelect.options).find(opt => normalizeText(ccaaTexto).includes(normalizeText(opt.text)));
            if (selectedCCAA) {
                ccaaSelect.value = selectedCCAA.value;
                ccaaSelect.dispatchEvent(new Event("change"));
            } else {
                alert("No se reconoció ninguna comunidad autónoma.");
                return;
            }

            // Paso 2: Pedimos la provincia después de que se carguen las opciones
            setTimeout(() => {
                reconocerTexto("Ahora di la provincia", (provinciaTexto) => {
                    let selectedProvincia = Array.from(provinciaSelect.options).find(opt => normalizeText(provinciaTexto).includes(normalizeText(opt.text)));
                    if (selectedProvincia) {
                        provinciaSelect.value = selectedProvincia.value;
                        provinciaSelect.dispatchEvent(new Event("change"));
                    } else {
                        alert("No se reconoció ninguna provincia.");
                        return;
                    }

                    // Paso 3: Pedimos la población después de que se carguen las opciones
                    setTimeout(() => {
                        reconocerTexto("Ahora di la población", (poblacionTexto) => {
                            let selectedPoblacion = Array.from(poblacionSelect.options).find(opt => normalizeText(poblacionTexto).includes(normalizeText(opt.text)));
                            if (selectedPoblacion) {
                                poblacionSelect.value = selectedPoblacion.value;
                                form.dispatchEvent(new Event("submit"));
                            } else {
                                alert("No se reconoció ninguna población.");
                            }
                        });
                    }, 2000);
                });
            }, 2000);
        });
    });


    const ccaaURL = "https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/ccaa.json";
    const provinciasURL = "https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/provincias.json";
    const poblacionesURL = "https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/poblaciones.json";

    // Cargamos CCAA
    fetch(ccaaURL)
        .then(response => response.json())
        .then(data => {
            data.forEach(ccaa => {
                const option = document.createElement("option");
                option.value = ccaa.code;
                option.textContent = ccaa.label;
                ccaaSelect.appendChild(option);
            });
        })
        .catch(error => console.error("Error cargando las CCAA:", error));

    // Cargamos provincias al seleccionar una CCAA
    ccaaSelect.addEventListener("change", () => {
        const selectedCCAA = ccaaSelect.value;
        provinciaSelect.innerHTML = '<option value="" disabled selected>Selecciona una opción</option>';
        poblacionSelect.innerHTML = '<option value="" disabled selected>Selecciona una opción</option>';

        fetch(provinciasURL)
            .then(response => response.json())
            .then(data => {
                const provinciasFiltradas = data.filter(provincia => provincia.parent_code === selectedCCAA);
                provinciasFiltradas.forEach(provincia => {
                    const option = document.createElement("option");
                    option.value = provincia.code;
                    option.textContent = provincia.label;
                    provinciaSelect.appendChild(option);
                });
            })
            .catch(error => console.error("Error cargando las provincias:", error));
    });

    // Cargamos poblaciones al seleccionar una provincia
    provinciaSelect.addEventListener("change", () => {
        const selectedProvincia = provinciaSelect.value;
        poblacionSelect.innerHTML = '<option value="" disabled selected>Selecciona una opción</option>';

        fetch(poblacionesURL)
            .then(response => response.json())
            .then(data => {
                const poblacionesFiltradas = data.filter(poblacion => poblacion.parent_code === selectedProvincia);
                poblacionesFiltradas.forEach(poblacion => {
                    const option = document.createElement("option");
                    option.value = poblacion.label;
                    option.textContent = poblacion.label;
                    poblacionSelect.appendChild(option);
                });
            })
            .catch(error => console.error("Error cargando las poblaciones:", error));
    });

    // Obtenemos coordenadas de una población: API REST
    async function obtenerCoordenadas(poblacion) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(poblacion)}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.length > 0) {
                return {
                    lat: data[0].lat,
                    lon: data[0].lon
                };
            } else {
                throw new Error("No se encontraron coordenadas para la población seleccionada.");
            }
        } catch (error) {
            console.error("Error obteniendo coordenadas:", error);
            return null;
        }
    }

    // Manejamos el envío del formulario
    form.addEventListener("submit", async (event) => {
        event.preventDefault(); 

        const poblacionSeleccionada = poblacionSelect.value;

        if (!poblacionSeleccionada) {
            alert("Por favor, selecciona una población.");
            return;
        }

        // Guardar la población seleccionada en LocalStorage
        localStorage.setItem("lastSelectedPoblacion", poblacionSeleccionada);

        // Limpiamos contenedores
        populationInfo.innerHTML = "";
        weatherInfo.innerHTML = "";
        imageContainer.innerHTML = "";
        mapContainer.innerHTML = "";

        // Mostramos contenedores
        populationInfo.style.display = "block";
        weatherInfo.style.display = "block";
        imageContainer.style.display = "flex";
        mapContainer.style.display = "block";

        // Obtiene información de Wikipedia: API REST
        const wikipediaApiUrl = `https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(poblacionSeleccionada)}`;
        fetch(wikipediaApiUrl)
            .then(response => response.json())
            .then(data => {
                const page = data.query.pages;
                const pageId = Object.keys(page)[0];
                const extract = page[pageId].extract;
                if (extract) {
                    populationInfo.innerHTML = `<h2>Información sobre ${poblacionSeleccionada}</h2><p>${extract}</p>`;
                }
            })
            .catch(error => console.error("Error obteniendo información de Wikipedia:", error));

        // Obtenemos coordenadas y luego la información del clima: API REST
        const coordenadas = await obtenerCoordenadas(poblacionSeleccionada);
        if (coordenadas) {
            // Obtiene clima con Open-Meteo API
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.lat}&longitude=${coordenadas.lon}&current_weather=true`)
                .then(response => response.json())
                .then(data => {
                    if (data.current_weather) {
                        weatherInfo.innerHTML = `<h2>Clima en ${poblacionSeleccionada}</h2>
                                                <p>Temperatura: ${data.current_weather.temperature}°C</p>
                                                <p>Viento: ${data.current_weather.windspeed} km/h</p>`;
                    }
                })
                .catch(error => console.error("Error obteniendo el clima:", error));

            // Crea el mapa con las coordenadas obtenidas
            const mapDiv = document.createElement("div");
            mapDiv.id = "mapid";
            mapDiv.style.height = "400px";
            mapContainer.appendChild(mapDiv);

            const map = L.map(mapDiv).setView([coordenadas.lat, coordenadas.lon], 12);

            // Añade el mapa base
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Añade un marcador para la población seleccionada
            L.marker([coordenadas.lat, coordenadas.lon]).addTo(map)
                .bindPopup(`<b>${poblacionSeleccionada}</b><br>Ubicación`)
                .openPopup();
        }

        // Obtiene imágenes de Wikimedia: API REST 
        const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=images&titles=${encodeURIComponent(poblacionSeleccionada)}&gimlimit=10&prop=imageinfo&iiprop=url`;
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (!data.query) {
                    imageContainer.innerHTML = "<p>No se encontraron imágenes para la población seleccionada.</p>";
                    return;
                }
                const pages = data.query.pages;
                const images = Object.values(pages).map(page => page.imageinfo?.[0]?.url).filter(Boolean);
            
                if (images.length > 0) {
                    images.forEach(imgUrl => {
                        const imageBox = document.createElement("div");
                        imageBox.classList.add("image-box");
                        const img = document.createElement("img");
                        img.src = imgUrl;
                        const caption = document.createElement("div");
                        caption.classList.add("image-caption");
                        caption.textContent = poblacionSeleccionada;
            
                        imageBox.appendChild(img);
                        imageBox.appendChild(caption);
                        imageContainer.appendChild(imageBox);
                    });
                } else {
                    imageContainer.innerHTML = "<p>No se encontraron imágenes para la población seleccionada.</p>";
                }
            })
            .catch(error => console.error("Error obteniendo las imágenes:", error));
    });
});