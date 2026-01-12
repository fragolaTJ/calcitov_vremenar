import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, ImageOverlay } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Legenda pogojev komponenta
function LegendTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block", marginLeft: "10px" }}>
      <span
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.3)",
          color: "white",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
          border: "1px solid rgba(255,255,255,0.5)"
        }}
      >
        ?
      </span>
      {isVisible && (
        <div style={{
          position: "absolute",
          bottom: "35px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#333",
          color: "white",
          padding: "15px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          zIndex: 1000,
          width: "280px",
          fontSize: "13px",
          lineHeight: "1.5"
        }}>
          <h4 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #555", paddingBottom: "8px" }}>
            📋 Legenda pogojev
          </h4>
          
          <div style={{ marginBottom: "12px" }}>
            <div style={{ color: "#4CAF50", fontWeight: "bold", marginBottom: "4px" }}>
              🟢 Trening naj bo!
            </div>
            <div style={{ fontSize: "12px", color: "#ccc" }}>
              • Padavine: {"<"} 0.3 mm<br/>
              • Brez neviht
            </div>
          </div>
          
          <div style={{ marginBottom: "12px" }}>
            <div style={{ color: "#FFC107", fontWeight: "bold", marginBottom: "4px" }}>
              🟡 POGOJNO
            </div>
            <div style={{ fontSize: "12px", color: "#ccc" }}>
              • Padavine: 0.3 - 1 mm<br/>
              • Verjetnost dežja {">"} 50%
            </div>
          </div>
          
          <div style={{ marginBottom: "8px" }}>
            <div style={{ color: "#F44336", fontWeight: "bold", marginBottom: "4px" }}>
              🔴 PREKLIČI / Odpovedano
            </div>
            <div style={{ fontSize: "12px", color: "#ccc" }}>
              • Verjetnost dežja {">"} 80% in padavine {">"} 1 mm<br/>
              • Nevihta
            </div>
          </div>

          <div style={{ 
            marginTop: "10px", 
            paddingTop: "8px", 
            borderTop: "1px solid #555",
            fontSize: "11px",
            color: "#888"
          }}>
            Dotakni se "?" za zaprtje
          </div>
        </div>
      )}
    </div>
  );
}

// Radar map component
function RadarMap({ radarUrl, radarBounds }) {
  return (
    <div style={{ height: "500px", width: "100%", marginTop: "20px" }}>
      <MapContainer
        center={[46.1, 14.8]}
        zoom={7}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <ImageOverlay url={radarUrl} bounds={radarBounds} opacity={0.6} />
      </MapContainer>
    </div>
  );
}

function App() {
    const [location, setLocation] = useState("Kamnik");
    const [currentWeather, setCurrentWeather] = useState(null);
    const [current_status, setCurrentStatus] = useState(null);

    const [startHour, setStartHour] = useState("17");
    const [endHour, setEndHour] = useState("18");
    const [hourlyForecast, setHourlyForecast] = useState([]);
    const [forecast_status, setForecastStatus] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // radar overlay setup
    const radarUrl = "https://meteo.arso.gov.si/uploads/probase/www/observ/radar/si0-rm-anim.gif";

    // Geografske meje ARSO radarja
    const radarBounds = [
      [47.625, 12.1], // top-left (lat, lon)
      [44.64, 17.44]  // bottom-right (lat, lon)
    ];

    // Funkcija za določanje barve statusa
    const getStatusColor = (status) => {
        if (status === "Trening naj bo!") return "#4CAF50"; // zelena
        if (status === "POGOJNO") return "#FFC107"; // rumena
        if (status === "ODPOVEDANO") return "#F44336"; // rdeča
        return "#999";
    };

    // Funkcija za določanje barve padavin
    const getPrecipColor = (precipMm, chanceOfRain = null) => {
        if (precipMm > 1) return "#F44336"; // rdeča - preveč
        if (precipMm > 0.3) return "#FFC107"; // rumena - mejno
        if (chanceOfRain !== null && chanceOfRain > 50 && precipMm > 0.3) return "#FFC107";
        return "#4CAF50"; // zelena - ok
    };

    // Funkcija za določanje barve vetra
    const getWindColor = (windKph) => {
        if (windKph > 35) return "#F44336"; // rdeča - preveč
        if (windKph > 20) return "#FFC107"; // rumena - mejno
        return "#4CAF50"; // zelena - ok
    };

    // ============================
    // 1. GET CURRENT WEATHER
    // ============================
    const analyzeCurrentWeather = (data) => {
        const current = data.current;

        let cancel = false;
        let borderline = false;

        if (current.precip_mm > 1) cancel = true;
        // if (current.wind_kph > 35) cancel = true;
        // if (current.vis_km < 2) cancel = true;
        if (current.thunder) cancel = true;

        if (current.precip_mm > 0.3) borderline = true;
        //if (current.wind_kph > 20) borderline = true;
        //if (current.uv > 7) borderline = true;

        if (cancel) return "Odpovedano";
        if (borderline) return "POGOJNO";
        return "Trening naj bo!";
    };

    const getCurrentWeather = useCallback(async () => {
        if (!location) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(
                `https://api.weatherapi.com/v1/current.json?key=3a8ec6d2c8cb41599db145345252011&q=${location}`
            );
            if (!res.ok) throw new Error("Napaka pri pridobivanju vremena.");
            const data = await res.json();
            setCurrentWeather(data);
            setCurrentStatus(analyzeCurrentWeather(data));
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }, [location]);

    const analyzeForecastWeather = useCallback((hour) => {

        let cancel = false;
        let borderline = false;

        //if (hour.precip_mm > 1) cancel = true;
        // if (current.wind_kph > 35) cancel = true;
        if (hour.chance_of_rain > 80 && hour.precip_mm > 1) cancel = true;
        if (hour.thunder) cancel = true;

        if (hour.chance_of_rain > 50 && hour.precip_mm > 0.3) borderline = true;
        //if (hour. > 20) borderline = true;
        //if (current.uv > 7) borderline = true;

        if (cancel) return "ODPOVEDANO";
        if (borderline) return "POGOJNO";
        return "Trening naj bo!";
    }, []);
    
    const analyzeForecastRange = useCallback((hours) => {
        let worst = "Trening naj bo!";

        for (const h of hours) {
            const status = analyzeForecastWeather(h);

            if (status === "ODPOVEDANO") return "ODPOVEDANO";
            if (status === "POGOJNO" && worst !== "ODPOVEDANO") worst = "POGOJNO";
        }

        return worst;
    }, [analyzeForecastWeather]);


  
  // ============================
  // 2. GET HOURLY FORECAST
  // ============================
  const getHourlyForecast = useCallback(async () => {
    if (!location || startHour === "" || endHour === "") return;

    setLoading(true);
    setError("");

    try {
        const res = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=3a8ec6d2c8cb41599db145345252011&q=${location}&days=1&aqi=no&alerts=no`
        );

        if (!res.ok) throw new Error("Napaka pri pridobivanju napovedi.");

        const data = await res.json();

        const hours = data.forecast.forecastday[0].hour;

        // filter results between startHour and endHour
        const filtered = hours.filter((h) => {
            const hourInt = parseInt(h.time.split(" ")[1].split(":")[0]);
            return hourInt >= parseInt(startHour) && hourInt <= parseInt(endHour);
        });

        setHourlyForecast(filtered);
        setForecastStatus(analyzeForecastWeather(filtered));
        setForecastStatus(analyzeForecastRange(filtered));
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  }, [location, startHour, endHour, analyzeForecastRange]);

  useEffect(() => {
        getCurrentWeather();
        getHourlyForecast();
    }, [getCurrentWeather, getHourlyForecast]);

    return (
        <div style={{ padding: "20px", maxWidth: "600px", margin: "auto", fontFamily: "Arial" }}>
      <h1>Calcitov dežurni vremenar</h1>

      {/* LOCATION INPUT */}
      <input
        type="text"
        placeholder="Vnesi lokacijo (npr. Ljubljana)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />

      {/* CURRENT WEATHER BUTTON */}
      <button onClick={getCurrentWeather} style={{ padding: "10px", width: "100%", marginBottom: "20px" }}>
        Pridobi trenutno vreme
      </button>

      {/* SHOW CURRENT WEATHER */}
      {currentWeather && (
        <div style={{ padding: "15px", background: "#eee", marginBottom: "20px", borderRadius: "8px" }}>
          <h2>Trenutno vreme za {currentWeather.location.name}</h2>
          <p>Temperatura: {currentWeather.current.temp_c}°C</p>
          <p>
            Količina padavin: 
            <span style={{ 
              color: getPrecipColor(currentWeather.current.precip_mm),
              fontWeight: "bold",
              marginLeft: "8px"
            }}>
              {currentWeather.current.precip_mm} mm
            </span>
          </p>
          <p>
            Veter: 
            <span style={{ 
              color: getWindColor(currentWeather.current.wind_kph),
              fontWeight: "bold",
              marginLeft: "8px"
            }}>
              {currentWeather.current.wind_kph} km/h
            </span>
          </p>
          <p>Pogoji: {currentWeather.current.condition.text}</p>
            <img 
              src={`https:${currentWeather.current.condition.icon}`} 
              alt={currentWeather.current.condition.text}
              style={{ width: "64px", height: "64px" }}
            />
          <div style={{ 
            marginTop: "15px",
            padding: "12px",
            backgroundColor: getStatusColor(current_status),
            color: "white",
            borderRadius: "6px",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            Odločitev za trening: {current_status}
            <LegendTooltip />
          </div>
        </div>
      )}

      <hr />

      <h2>Napoved med urami</h2>

      {/* HOURS INPUT */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          type="number"
          placeholder="Začetna ura (0-23)"
          min="0"
          max="23"
          value={startHour}
          onChange={(e) => setStartHour(e.target.value)}
          style={{ flex: 1, padding: "10px" }}
        />
        <input
          type="number"
          placeholder="Končna ura (0-23)"
          min="0"
          max="23"
          value={endHour}
          onChange={(e) => setEndHour(e.target.value)}
          style={{ flex: 1, padding: "10px" }}
        />
      </div>

      {/* HOURLY FORECAST BUTTON */}
      <button onClick={getHourlyForecast} style={{ padding: "10px", width: "100%", marginBottom: "20px" }}>
        Pridobi napoved
      </button>

      {/* SHOW HOURLY FORECAST */}
      {hourlyForecast.length > 0 && (
        <div style={{ padding: "15px", background: "#f3f3f3", borderRadius: "8px" }}>
          <h3>Napoved med {startHour}:00 in {endHour}:00</h3>
          {hourlyForecast.map((h) => {
            const hourStatus = analyzeForecastWeather(h);
            return (
              <div key={h.time} style={{ 
                marginBottom: "12px", 
                padding: "10px", 
                background: "#fff", 
                borderRadius: "5px",
                border: `2px solid ${getStatusColor(hourStatus)}`
              }}>
                <strong>{h.time}</strong>
                <p>Temp: {h.temp_c}°C</p>
                <p>
                  Padavine: 
                  <span style={{ 
                    color: getPrecipColor(h.precip_mm, h.chance_of_rain),
                    fontWeight: "bold",
                    marginLeft: "8px"
                  }}>
                    {h.precip_mm} mm
                  </span>
                </p>
                <p>
                  Verjetnost padavin: 
                  <span style={{ 
                    color: h.chance_of_rain > 80 ? "#F44336" : h.chance_of_rain > 50 ? "#FFC107" : "#4CAF50",
                    fontWeight: "bold",
                    marginLeft: "8px"
                  }}>
                    {h.chance_of_rain}%
                  </span>
                </p>
                <p>
                  Veter: 
                  <span style={{ 
                    color: getWindColor(h.wind_kph),
                    fontWeight: "bold",
                    marginLeft: "8px"
                  }}>
                    {h.wind_kph} km/h
                  </span>
                </p>
                <p>Pogoji: {h.condition.text}</p>
                <img 
                  src={`https:${h.condition.icon}`} 
                  alt={h.condition.text}
                  style={{ width: "64px", height: "64px" }}
                />
                <div style={{ 
                  marginTop: "8px",
                  padding: "8px",
                  backgroundColor: getStatusColor(hourStatus),
                  color: "white",
                  borderRadius: "4px",
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "14px"
                }}>
                  {hourStatus}
                </div>
              </div>
            );
          })}
          <div style={{ 
            marginTop: "15px",
            padding: "12px",
            backgroundColor: getStatusColor(forecast_status),
            color: "white",
            borderRadius: "6px",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            Skupna odločitev za trening: {forecast_status}
            <LegendTooltip />
          </div>
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <h2>Radarska slika padavin (ARSO in leaflet map)</h2>
        <RadarMap radarUrl={radarUrl} radarBounds={radarBounds} />
      </div>
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <h2>Radarska slika padavin (ARSO)</h2>
        <img
          src="https://meteo.arso.gov.si/uploads/probase/www/observ/radar/si0-rm-anim.gif"
          alt="ARSO radar"
          style={{ maxWidth: "100%", borderRadius: "10px" }}
        />
        <p style={{ marginTop: "8px" }}>
          <a
            href="https://meteo.arso.gov.si/uploads/meteo/app/inca/?par=si0zm"
            target="_blank"
            rel="noopener noreferrer"
          >
            Odpri ARSO interaktivno karto
          </a>
        </p>
      </div>
      {/* ERRORS */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading && <p>Nalaganje...</p>}
    </div>
  );
}

export default App;
