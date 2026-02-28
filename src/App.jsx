import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

mapboxgl.accessToken = 'pk.eyJ1IjoibGlhbmFyaSIsImEiOiJjbW01bjlsd2wwMnUyMnFxNHV3YjcyZmR1In0.2Oij-VtaQqoBIA-GvuydGg';

const firebaseConfig = {
  apiKey: "AIzaSyAh7cgObhkQmdg3U5A_g7LJHHISZHYzVVU",
  authDomain: "mapitauwu.firebaseapp.com",
  databaseURL: "https://mapitauwu-default-rtdb.firebaseio.com",
  projectId: "mapitauwu",
  storageBucket: "mapitauwu.firebasestorage.app",
  messagingSenderId: "370557096285",
  appId: "1:370557096285:web:f7151affcf37fa0e5658b4",
  measurementId: "G-ZHS2H7SBGX"
};

// Inicializa Firebase solo una vez
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [lng] = useState(-68.1193);
  const [lat] = useState(-16.4897);
  const [zoom] = useState(14);

  useEffect(() => {
    if (map.current) return;

    // Crear mapa
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });

    // Crear marcador inicial
    marker.current = new mapboxgl.Marker({ color: 'purple' })
      .setLngLat([lng, lat])
      .addTo(map.current);

    // Escuchar el nodo correcto en Firebase
    const ubicacionRef = ref(database, 'ubicacion');

    onValue(ubicacionRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Datos recibidos de Firebase:", data);
      if (data?.lat && data?.lng) {
        marker.current.setLngLat([data.lng, data.lat]);
        map.current.flyTo({
          center: [data.lng, data.lat],
          essential: true
        });
      }
    });
  }, []);

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <div style={{ backgroundColor: '#222', color: 'white', padding: '15px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>📍 Rastreador de Ubicación</h2>
      </div>
      <div ref={mapContainer} style={{ width: '100vw', height: '90vh' }} />
    </div>
  );
}

export default App;
