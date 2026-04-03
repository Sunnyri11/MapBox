import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

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

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const prevCoords = useRef(null);
  const [lng] = useState(-68.1193);
  const [lat] = useState(-16.4897);
  const [zoom] = useState(14);
  const lastAlertTime = useRef(0);
  const isInsideRef = useRef(false);
  const circleIdRef = useRef("geofence-circle");

  const [geoLat, setGeoLat] = useState(-16.50337605);
  const [geoLng, setGeoLng] = useState(-68.1199373637832);
  const [geoRadius, setGeoRadius] = useState(400);

  const drawCircle = (centerLat, centerLng, radius) => {
    if (!map.current) return;
    if (map.current.getLayer(circleIdRef.current)) {
      map.current.removeLayer(circleIdRef.current);
    }
    if (map.current.getSource(circleIdRef.current)) {
      map.current.removeSource(circleIdRef.current);
    }
    const points = 64;
    const coords = [];
    for (let i = 0; i < points; i++) {
      const angle = (i * 360) / points;
      const dx = radius * Math.cos(angle * Math.PI / 180);
      const dy = radius * Math.sin(angle * Math.PI / 180);
      const dLat = dy / 111320;
      const dLng = dx / (111320 * Math.cos(centerLat * Math.PI / 180));
      coords.push([centerLng + dLng, centerLat + dLat]);
    }
    coords.push(coords[0]);
    map.current.addSource(circleIdRef.current, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] }
      }
    });
    map.current.addLayer({
      id: circleIdRef.current,
      type: 'fill',
      source: circleIdRef.current,
      paint: { 'fill-color': '#088', 'fill-opacity': 0.3 }
    });
  };

  const saveGeofence = async () => {
    const geofenceRef = ref(database, 'geofence');
    await set(geofenceRef, { lat: geoLat, lng: geoLng, radius: geoRadius });
    alert("✅ Geocerca guardada en Firebase");
    drawCircle(geoLat, geoLng, geoRadius);
    const ubicacionSnap = await get(ref(database, 'ubicacion'));
    const ubicacion = ubicacionSnap.val();
    if (ubicacion?.lat && ubicacion?.lng) {
      const distance = distanceInMeters(ubicacion.lat, ubicacion.lng, geoLat, geoLng);
      if (distance <= geoRadius) {
        alert("✅ Está dentro del área");
        isInsideRef.current = true;
      } else {
        alert("⚠️ Fuera del área");
        isInsideRef.current = false;
        lastAlertTime.current = Date.now();
      }
    }
  };

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });
    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-left');
    const arrowEl = document.createElement('div');
    arrowEl.style.width = '0';
    arrowEl.style.height = '0';
    arrowEl.style.borderLeft = '10px solid transparent';
    arrowEl.style.borderRight = '10px solid transparent';
    arrowEl.style.borderBottom = '20px solid purple';
    arrowEl.style.transform = 'rotate(0deg)';
    marker.current = new mapboxgl.Marker(arrowEl).setLngLat([lng, lat]).addTo(map.current);
    const ubicacionRef = ref(database, 'ubicacion');
    const geofenceRef = ref(database, 'geofence');

    const updateLocation = async () => {
      const snapshot = await get(ubicacionRef);
      const data = snapshot.val();
      if (data?.lat && data?.lng) {
        if (prevCoords.current) {
          const dx = data.lng - prevCoords.current.lng;
          const dy = data.lat - prevCoords.current.lat;
          const angleRad = Math.atan2(dy, dx);
          const angleDeg = angleRad * (180 / Math.PI);
          arrowEl.style.transform = `rotate(${angleDeg}deg)`;
        }
        prevCoords.current = { lat: data.lat, lng: data.lng };
        marker.current.setLngLat([data.lng, data.lat]);
        map.current.flyTo({ center: [data.lng, data.lat], essential: true });
        const geoSnap = await get(geofenceRef);
        const geofence = geoSnap.val();
        if (geofence) {
          drawCircle(geofence.lat, geofence.lng, geofence.radius);
          const distance = distanceInMeters(data.lat, data.lng, geofence.lat, geofence.lng);
          if (distance <= geofence.radius) {
            if (!isInsideRef.current) {
              alert("✅ Está dentro del área");
              isInsideRef.current = true;
            }
          } else {
            const now = Date.now();
            if (now - lastAlertTime.current >= 10 * 60 * 1000) {
              alert("⚠️ Fuera del área");
              lastAlertTime.current = now;
            }
            isInsideRef.current = false;
          }
        }
      }
    };

    updateLocation();
    const interval = setInterval(updateLocation, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <div style={{ backgroundColor: '#222', color: 'white', padding: '15px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>📍 Rastreador de Ubicación <br />Jhoel Flores Vargas</h2>
        <div style={{ marginTop: '10px', color: 'white' }}>
          <label>Latitud: </label>
          <input type="number" step="any" value={geoLat} onChange={e => setGeoLat(parseFloat(e.target.value))} />
          <label> Longitud: </label>
          <input type="number" step="any" value={geoLng} onChange={e => setGeoLng(parseFloat(e.target.value))} />
          <label> Radio (m): </label>
          <input type="number" value={geoRadius} onChange={e => setGeoRadius(parseFloat(e.target.value))} />
          <button onClick={saveGeofence} style={{ marginLeft: '10px' }}>Guardar Geocerca</button>
        </div>
      </div>
      <div ref={mapContainer} style={{ width: '100vw', height: '85vh' }} />
    </div>
  );
}

export default App;
