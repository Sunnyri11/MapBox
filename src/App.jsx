import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

mapboxgl.accessToken = "pk.eyJ1IjoibGlhbmFyaSIsImEiOiJjbW01bjlsd2wwMnUyMnFxNHV3YjcyZmR1In0.2Oij-VtaQqoBIA-GvuydGg";

const firebaseConfig = {
  apiKey: "AIzaSyAh7cgObhkQmdg3U5A_g7LJHHISZHYzVVU",
  authDomain: "mapitauwu.firebaseapp.com",
  databaseURL: "https://mapitauwu-default-rtdb.firebaseio.com",
  projectId: "mapitauwu",
  storageBucket: "mapitauwu.appspot.com",
  messagingSenderId: "370557096285",
  appId: "1:370557096285:web:f7151affcf37fa0e5658b4",
  measurementId: "G-ZHS2H7SBGX"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null);
  const marker = useRef(null);
  const prevCoords = useRef(null);

  const [lng] = useState(-68.1193);
  const [lat] = useState(-16.4897);
  const [zoom] = useState(14);

  const isInsideRef = useRef(false);
  const lastOutsideAlertTime = useRef(0);

  useEffect(() => {
    if (map.current) return;

    // Inicializar mapa
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true }
    });
    map.current.addControl(draw.current, 'top-left');

    // Crear flecha morada como marcador
    const arrowEl = document.createElement('div');
    arrowEl.style.width = '0';
    arrowEl.style.height = '0';
    arrowEl.style.borderLeft = '10px solid transparent';
    arrowEl.style.borderRight = '10px solid transparent';
    arrowEl.style.borderBottom = '20px solid purple';
    arrowEl.style.transform = 'rotate(0deg)';

    marker.current = new mapboxgl.Marker(arrowEl).setLngLat([lng, lat]).addTo(map.current);

    // Guardar geocerca en Firebase y verificar estado actual
    map.current.on('draw.create', async (e) => {
      const geojson = e.features[0];
      await set(ref(database, 'geofences/' + geojson.id), geojson);
      alert("📍 Geocerca creada y guardada en Firebase");

      await verifyLocationState(); // 🔹 Verificar inmediatamente dentro/fuera
    });

    // Eliminar geocerca en Firebase y verificar estado actual
    map.current.on('draw.delete', async (e) => {
      e.features.forEach(async (feature) => {
        await set(ref(database, 'geofences/' + feature.id), null);
      });
      alert("🗑️ Geocerca eliminada de Firebase");

      await verifyLocationState(); // 🔹 Verificar inmediatamente dentro/fuera
    });

    // Cargar geocercas guardadas
    const loadGeofences = async () => {
      const geofencesSnap = await get(ref(database, 'geofences'));
      const data = geofencesSnap.val();
      if (data) {
        const features = Object.values(data).filter(Boolean);
        draw.current.add({ type: 'FeatureCollection', features });
      }
    };
    loadGeofences();

    // Verificar ubicación y actualizar flecha
    const checkLocation = async () => {
      await verifyLocationState(true); // 🔹 aquí sí incluye la lógica de regreso
    };

    checkLocation();
    const interval = setInterval(checkLocation, 10000);
    return () => clearInterval(interval);
  }, []);

  // 🔹 Función para verificar ubicación contra TODAS las geocercas
  const verifyLocationState = async (includeReturn = false) => {
    const ubicacionSnap = await get(ref(database, 'ubicacion'));
    const ubicacion = ubicacionSnap.val();
    if (!ubicacion) return;

    // Actualizar posición del marcador
    marker.current.setLngLat([ubicacion.lng, ubicacion.lat]);
    map.current.flyTo({ center: [ubicacion.lng, ubicacion.lat], essential: true });

    // Rotar flecha según movimiento
    const arrowEl = marker.current.getElement();
    if (prevCoords.current) {
      const dx = ubicacion.lng - prevCoords.current.lng;
      const dy = ubicacion.lat - prevCoords.current.lat;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * (180 / Math.PI);
      arrowEl.style.transform = `rotate(${angleDeg}deg)`;
    }
    prevCoords.current = { lat: ubicacion.lat, lng: ubicacion.lng };

    // Verificar geocercas
    const geofencesSnap = await get(ref(database, 'geofences'));
    const geofences = geofencesSnap.val();

    if (geofences) {
      const userPoint = point([ubicacion.lng, ubicacion.lat]);
      let insideAny = false;
      Object.values(geofences).forEach((feature) => {
        if (feature && booleanPointInPolygon(userPoint, feature)) {
          insideAny = true;
        }
      });

      const now = Date.now();

      if (insideAny) {
        if (!isInsideRef.current) {
          alert("✅ Usuario dentro de una geocerca");
          isInsideRef.current = true;
        }
      } else {
        if (isInsideRef.current) {
          alert("🔄 Usuario salió de todas las geocercas");
          isInsideRef.current = false;
          lastOutsideAlertTime.current = now;
        } else if (includeReturn && now - lastOutsideAlertTime.current >= 15 * 60 * 1000) {
          alert("⚠️ Usuario fuera de todas las geocercas");
          lastOutsideAlertTime.current = now;
        }
      }
    }
  };

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <div style={{ backgroundColor: '#222', color: 'white', padding: '15px', textAlign: 'center' }}>
        <h2>📍 Rastreador de Ubicación <br />Jhoel Flores Vargas</h2>
        <button onClick={() => draw.current.changeMode('draw_polygon')} style={{ marginRight: '10px' }}>
          Crear área
        </button>
        <button onClick={() => draw.current.trash()}>
          Eliminar área
        </button>
      </div>
      <div ref={mapContainer} style={{ width: '100vw', height: '85vh' }} />
    </div>
  );
}

export default App;
