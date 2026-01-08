import React, { useState } from "react";

function App() {
  const [location, setLocation] = useState("Kamnik");
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const analyzeWeather = (data) => {
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

    if (cancel) return "PREKLIČI";
    if (borderline) return "POGOJNO";
    return "OK";
  };

  const fetchWeather = async () => {
  setLoading(true);
  setWeather(null);
  setStatus(null);
  setApiError(null);

  try {
    // const apiKey = process.env.REACT_APP_WEATHER_API_KEY;

    const url = `https://api.weatherapi.com/v1/current.json?key=3a8ec6d2c8cb41599db145345252011&q=${location}&aqi=no`;

    const res = await fetch(url);
    const data = await res.json();

    // Če API vrne napako (npr. invalid key, location not found)
    if (data.error) {
      setApiError(data.error.message);
      setLoading(false);
      return;
    }

    // Data je veljaven → shrani
    setWeather(data);
    setStatus(analyzeWeather(data));

  } catch (err) {
    setApiError("Napaka pri povezavi do WeatherAPI");
  }

  setLoading(false);
};


  return (
    <div style={{ fontFamily: "Arial", padding: "20px", maxWidth: "700px", margin: "auto" }}>
      <h1 style={{ textAlign: "center" }}>Weather Training App</h1>

      <div style={{ marginTop: "20px" }}>
        <label>Lokacija (mesto ali koordinate):</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="npr. Ljubljana ali 46.05,14.5"
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      <button
        onClick={fetchWeather}
        style={{
          marginTop: "15px",
          padding: "10px 20px",
          width: "100%",
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Pridobi vreme
      </button>

      {/* LOADER */}
      {loading && <p style={{ marginTop: "20px" }}>Nalaganje...</p>}

      {/* API ERROR */}
      {apiError && (
        <p
          style={{
            marginTop: "20px",
            padding: "10px",
            background: "#ffe2e2",
            color: "#b70000",
            borderRadius: "6px",
          }}
        >
          Napaka: {apiError}
        </p>
      )}

      {/* WEATHER RESULT */}
      {weather && weather.location && (
        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            borderRadius: "10px",
            background: "#f7f7f7",
          }}
        >
          <h2>
            {weather.location.name}, {weather.location.country}
          </h2>

          <p><strong>Temperatura:</strong> {weather.current.temp_c}°C</p>
          <p><strong>Veter:</strong> {weather.current.wind_kph} km/h</p>
          <p><strong>Padavine:</strong> {weather.current.precip_mm} mm</p>
          <p><strong>Vidljivost:</strong> {weather.current.vis_km} km</p>
          <p><strong>Vlažnost:</strong> {weather.current.humidity}%</p>
          <p><strong>Oblačnost:</strong> {weather.current.cloud}%</p>
          <p><strong>UV indeks:</strong> {weather.current.uv}</p>

          <h3 style={{ marginTop: "20px" }}>
            Odločitev za trening:{" "}
            <span
              style={{
                color:
                  status === "OK"
                    ? "green"
                    : status === "POGOJNO"
                    ? "orange"
                    : "red",
              }}
            >
              {status}
            </span>
          </h3>
        </div>
      )}
    </div>
  );
}

export default App;
