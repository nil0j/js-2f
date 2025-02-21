const CCAA = document.getElementById("ccaa")
const CCAA_LINK = "https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/ccaa.json"
const PROVINCE = document.getElementById("provincia")
const PROVINCE_LINK = "https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/provincias.json"
const POPULATION = document.getElementById("poblacion")
const POPULATION_LINK = "https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/refs/heads/master/poblaciones.json"
let ccaaHashMap
let provinceHashMap
let map_coordinates

potatoes.addEventListener("click", e => {
    e.target.requestFullscreen()
})

const IMAGE_CONTAINER = document.getElementById("image-container")

const FORM = document.getElementsByTagName("form")[0]

async function start() {
    fillCCAA()
    updateTime()
    updateBattery()
    updateRam()
}

async function fetchLink(link) {
    let response = await fetch(link)
    let data = response.json()
    return data
}

async function fillCCAA() {
    ccaaHashMap = {}
    resetOptions(CCAA)

    await fetchLink(CCAA_LINK).then(r => r.forEach(data => {
        let optionInstance = document.createElement("option")
        let name = data.label == "Cataluńa" ? "Catalunya" : data.label
        optionInstance.innerHTML = name
        CCAA.append(optionInstance)
        ccaaHashMap[name] = data.code
    }))
}

async function fillProvince(code) {
    provinceHashMap = {}
    resetOptions(PROVINCE)
    resetOptions(POPULATION)

    await fetchLink(PROVINCE_LINK).then(
        r => {
            r.forEach(data => {
                if (data.parent_code != code) return
                let optionInstance = document.createElement("option")
                optionInstance.innerHTML = data.label
                PROVINCE.append(optionInstance)
                provinceHashMap[data.label] = data.code
            })
        })
}

async function fillPopulation(code) {
    resetOptions(POPULATION)

    await fetchLink(POPULATION_LINK).then(r => r.forEach(data => {
        if (data.parent_code != code) return
        let optionInstance = document.createElement("option")
        optionInstance.innerHTML = data.label
        POPULATION.append(optionInstance)
        provinceHashMap[data.label] = data.code
    }))
}

async function resetOptions(element) {
    element.innerHTML = ""

    let defaultOption = document.createElement("option")
    defaultOption.disabled = true
    defaultOption.selected = true
    defaultOption.innerText = "Selecciona una opción"
    element.append(defaultOption)
}

CCAA.addEventListener("input", _ => {
    let ccaaCode = ccaaHashMap[CCAA.value]
    fillProvince(ccaaCode)
})

PROVINCE.addEventListener("input", _ => {
    let provinceCode = provinceHashMap[PROVINCE.value]
    fillPopulation(provinceCode)
})

FORM.addEventListener("submit", e => {
    e.preventDefault()
    let values = new FormData(FORM)

    const DEFAULT = "Selecciona una opción"

    let value = CCAA.value
    let bigMap = true
    let previous = undefined
    let stage = 0

    if (PROVINCE.value != DEFAULT) {
        value = PROVINCE.value
        previous = CCAA.value
        stage = 1
    }

    if (POPULATION.value != DEFAULT) {
        value = POPULATION.value
        previous = PROVINCE.value
        bigMap = false
        stage = 2
    }

    spawnResults(value, bigMap)

    createPokemon({
        name: value,
        stage: stage,
        previous: previous,
    })
})

async function spawnResults(value, bigMap) {
    await spawnPics(value)
    await spawnMap(value, bigMap)
}

async function spawnPics(text) {
    IMAGE_CONTAINER.innerHTML = ""
    let pics = await getPics(text)

    if (pics == undefined) {
        let message = document.createElement("p")
        message.innerHTML = "no hay resultados <i>*c muere*</i>"
        message.style.color = "red"
        message.style.textAlign = "center"
        IMAGE_CONTAINER.append(message)
        return
    }

    for (let key in pics) {
        let img_box = document.createElement("div")
        img_box.className = "image-box"
        let img = document.createElement("img")
        let pic = pics[key];
        img.src = pic.imageinfo[0].url
        img_box.append(img)
        IMAGE_CONTAINER.append(img_box)

        img_box.addEventListener("click", e => {
            e.target.requestFullscreen()
        })
    }
}

async function spawnMap(text, bigMap) {
    document.getElementById("map").innerHTML = ""

    let coordinates = await getMapPosition(text)
    map_coordinates = coordinates
    let user_coordinates = getUserPosition()
    console.log(user_coordinates)
    console.log("position: ", position)

    map = new OpenLayers.Map("map");
    var fromProjection = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
    var toProjection = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection
    var position = new OpenLayers.LonLat(coordinates[0], coordinates[1]).transform(fromProjection, toProjection);
    console.log("bog map: ", bigMap)
    var zoom = bigMap ? 9 : 12;

    map.addLayer(new OpenLayers.Layer.OSM());
    map.setCenter(position, zoom);

    getUserPosition()
}

async function getMapPosition(text) {
    let position = text.replace(/ /g, "-")
    let result = await fetch(`https://nominatim.openstreetmap.org/search?q=135+${position}&format=json`)
    console.log("result: ", result)
    let json = await result.json()
    console.log("json: ", json)
    let latitude = json[0].lat
    let longitude = json[0].lon
    let coordinates = [longitude, latitude]
    return coordinates
}

async function getPics(text) {
    res = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=images&titles=${text}&gimlimit=10&prop=imageinfo&iiprop=url`)
    json = await res.json()
    return (json.query != undefined) ? json.query.pages : undefined
}

async function getSingleImage(name) {
    let pics = await getPics(name);
    console.log("pics", pics, "name", name)
    if (pics != undefined) {
        let first = Object.keys(pics)[0]
        return pics[first].imageinfo[0].url
    } else {
        return ""
    }

}

function createImage(src) {
    console.log("Create image: ", src)
    let image = document.createElement("img")
    image.src = src
    return image
}

async function createPokemon({
    name = "Nombre",
    stage = 0,
    previous = undefined,
}) {
    let cover = await getSingleImage(name)

    let previousSrc
    if (previous != undefined) {
        getPics(previous)
        previousSrc = await getSingleImage(previous)
    }

    let base_img = new Image(),
        canvas = document.getElementById("canvas"),
        ctx = canvas.getContext("2d");

    // (B) WRITE TEXT ON IMAGE
    base_img.onload = () => {
        // (B1) SOURCE IMAGE
        canvas.width = base_img.naturalWidth;
        canvas.height = base_img.naturalHeight;
        ctx.drawImage(base_img, 0, 0, base_img.naturalWidth, base_img.naturalHeight);

        // (B2) ADD TEXT
        ctx.font = "bold 24px sans-serif";
        ctx.lineWidth = 2;
        ctx.fillText(name, 105, 45);

        ctx.font = "bold 20px sans-serif";
        ctx.fillText("Impactrueno", 50, 350);
        ctx.fillText("80", 330, 350);

        let options = [
            "Pobreza",
            "Madrileños",
            "Bocatito de calamares",
            "Crema catalana",
            "Tumba de Franco",
            "Tortilla de patatas",
            "Inflacion",
            "Pisos turisticos",
            "Pedro Sanchez estuvo aqui",
        ]
        ctx.fillText(options[Math.floor(Math.random() * options.length)], 50, 390);
        ctx.fillText("150", 330, 390);

        if (stage == 1) {
            ctx.font = "bold 25px sans-serif";
            ctx.fillText("1", 68, 36);
        }

        // Add images
        let image = createImage(cover)
        image.onload = _ => {
            ctx.drawImage(image, 30, 50, 365, 250)

            if (previous != undefined) {
                let image2 = createImage(previousSrc)
                image2.className = "image-previous"
                image2.onload = _ => {
                    ctx.drawImage(image2, 20, 40, 50, 50)
                }

            }

            let last = stage == 2 ? PROVINCE : CCAA
            ctx.fillText(`Evoluciona de ${last}`, 100, 200);

        }

    };

    switch (stage) {
        case 0: base_img.src = "card.png"; break;
        case 1: base_img.src = "card2.png"; break;
        case 2: base_img.src = "card2.png"; break;
    }

    canvas.addEventListener("click", _ => {
        console.log("hi")
        canvas.requestFullscreen()
    })
}

async function updateTime() {
    let nowDate = new Date()
    let date = nowDate.getDay() + '/' + (nowDate.getMonth() + 1) + '/' + nowDate.getFullYear();
    document.getElementById("date").innerText = date
    document.getElementById("time").innerText = new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, minute: 'numeric', second: 'numeric' });
    setTimeout(updateTime, 1000)
}

function showPosition(position) {
    map_info.innerHTML = ""
    let map_info = document.getElementById("map-info")
    let lon = position.coords.longitude - map_coordinates[0]
    let lat = position.coords.latitude - map_coordinates[1]
    let distance = Math.sqrt(Math.pow(lan, 2) + Math.pow(lat, 2));
    map_info.innerHTML = "Distancia: ", distance
}

function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            console.log("User denied the request for Geolocation.")
            break;
        case error.POSITION_UNAVAILABLE:
            console.log("Location information is unavailable.")
            break;
        case error.TIMEOUT:
            console.log("The request to get user location timed out.")
            break;
        case error.UNKNOWN_ERROR:
            console.log("An unknown error occurred.")
            break;
    }
}

async function getUserPosition() {
    navigator.geolocation.getCurrentPosition(showPosition, showError);
}

function updateBattery() {
    if (!navigator.getBattery) {
        return
    }
    navigator.getBattery().then((battery) => {
        updateChargeInfo();
        updateLevelInfo();

        battery.addEventListener("chargingchange", () => {
            updateChargeInfo();
        });
        function updateChargeInfo() {
            document.getElementById("battery-image").src = battery.charging ? "font-awesome/battery-full.svg" : "font-awesome/battery-notfull.svg"
        }

        battery.addEventListener("levelchange", () => {
            updateLevelInfo();
        });
        function updateLevelInfo() {
            document.getElementById("battery").innerHTML = `${battery.level * 100}%`
        }
    })
}

async function updateRam() {
    if (!navigator.deviceMemory) {
        return
    }
    document.getElementById("resources").innerHTML = `${navigator.deviceMemory}G`
}

start()
