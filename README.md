<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Platform-Web-blue.svg?style=for-the-badge" alt="Platform" />
  <img src="https://img.shields.io/badge/Python-3.x-blue.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Node.js-18.x-green.svg?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react&logoColor=white" alt="React" />
</div>

<h1 align="center">🛡️ SmartNav Intelligence & Safety System</h1>

<p align="center">
  <b>A real-time geospatial intelligence, anomaly-detection, and emergency routing ecosystem.</b>
</p>

---

## 📖 Table of Contents
1. [What is SmartNav?](#-what-is-smartnav)
2. [Why Web-Scraping? (The 99% Accuracy Advantage)](#-why-web-scraping-the-99-accuracy-advantage)
3. [System Architecture Flow](#-system-architecture-flow)
4. [Law Enforcement Interfaces (Gallery & Workflows)](#-law-enforcement-interfaces-gallery--workflows)
5. [Core Technologies & Their Roles](#-core-technologies--their-roles)
6. [Local Deployment Setup (A-Z Guide)](#-local-deployment-setup-a-z-guide)

---

## 🎯 What is SmartNav?
Most contemporary navigation engines (Google Maps, Waze) rely on a singular optimization heuristic: **Time Efficiency (Speed Algorithm)**. SmartNav pivots to prioritize **Geospatial Safety Constraints**. 

SmartNav is a comprehensive stack that:
- **For the User:** Dynamically routes travelers *around* statistically dangerous areas, providing Choropleth safety mapping grids, and granting instant 1-Click SOS payload dispatches seamlessly integrating with external responders.
- **For Law Enforcement:** Replaces passively-updated flat-map databases with an interactive **3D WebGL Intelligence Globe** to visually track real-time restricted area breaches, active SOS location coordinates, and historical demographic analysis.

---

## 💡 Why Web-Scraping? (The 99% Accuracy Advantage)
Standard crime-mapping applications rely heavily on static government datasets (CSV dumps that happen annually or quarterly). 
- **The Vulnerability:** If a riot breaks out, a street floods, or a localized threat emerges *right now*, a standard application will blindly navigate a user into the danger zone because the database is out of date.

**The SmartNav Solution:** We integrated an automated Python **Web-Scraping Pipeline** as our primary data-ingestion mechanism. 
By utilizing Python to continuously scrape live regional newspaper sites, breaking news portals, and real-time incident feeds throughout the hour, SmartNav dynamically alters geospatial threat scores (`dangerWeights`) in near real-time. If a protest is reported on a street on a local news site, our engine maps the string literal to coordinates and instantly triggers a routing diversion for any incoming client queries.

---

## 🔄 System Architecture Flow

![Flow Diagram](images/flow_diagram.png)  
*(An abstract overview of the SmartNav dispatch sequence)*

The architecture strictly delineates the User client from the Police client, connected asynchronously by the server node logic:

1. **User Side (Top):** From the web-facing gateway, a validated user queries an `Origin` and `Destination`. The server pings the Python script to apply the live **Safety Layer** (Scraped constraints + Historical data). The front-end renders the Safe Route. If a user presses SOS, the React client bundles the entire localized state and POSTs the `Emergency Alert`.
2. **Police Side (Bottom):** Administrator accounts bypass routing into the **CIA-Style Monitoring Suite**. Alerts emitted from the User Side are caught dynamically. Admins can execute restricted bounding queries (*Persons in Zone X*), review missing complaints, or launch the master 3D Globe to spatially verify the situation.

---

## 👮 Law Enforcement Interfaces (Gallery & Workflows)

SmartNav’s frontend pushes heavy WebGL elements for immersive data analysis.

### 1. The Risk Intelligence Command Center
![Choropleth Dashboard](images/choropleth_dashboard.png)  
*The tactical 2D command map aggregates backend Geospatial data. It renders the state using colored heat dots (`Red=Critical`, `Yellow=Moderate`, `Green=Safe`). The left panel crunches macro analytics (e.g., `87.1% Avg Safety`) and pushes a live **Alert Feed** pulling directly from the news scraping mechanism.*

### 2. 3D Globe Intelligence Viewer (CesiumJS)
![3D Globe Dashboard](images/3d_globe_dashboard.png)  
*For deeper tactical awareness, the engine swaps instances to a cinematic 3D Earth using WebGL. Officers can search specific Latitude/Longitude hashes, causing the camera to physically "Fly-To" the location from space down to street level, mapping the surrounding terrain instantly.*

### 3. Identity Verification & Intel Platform
![Security Intel Platform](images/security_intel_platform.png)  
*A complete profile lookup node. Querying a UID (e.g. `Lingesh G R`) pulls their stored Firebase constraints (Contact Intel, Biometric Profile). This screen is critical for kidnapped or missing-person events, enabling **GPS Trackping** and historical **Heat Trails**.*

### 4. Automated Geo-Fencing Logs
![Restricted Area Logs](images/restricted_area_logs.png)  
*Law enforcement can asynchronously draw "Geo-fences" (invisible polygons) around specific areas. If any connected user physically crosses the polygon threshold, the React app pushes the breach to this log table. Officers are handed instant red **MATCHING!** alerts for subjects physically violating a restricted space.*

---

## 🛠️ Core Technologies & Their Roles

SmartNav adopts a strict separation of concerns, operating heavily across three separate servers.

### 1. Frontend Client
- **React 18 + Vite:** Fast hot-module-reloading UI generation and localized state management.
- **CesiumJS & WebGL:** The absolute powerhouse behind the 3D Intelligence Globe manipulation. Allows mapping custom vectors/polygons directly onto a spinning 3D rendering.
- **React-Leaflet:** The foundational mapping library used for the 2D Choropleth maps and routing traces.

### 2. Action Backend Server (Node)
- **Node.js & Express 5.x:** ReSTful API structure bridging the frontend to the DB and Python scripts. 
- **Twilio API SDK:** Cellular dispatch network. Triggered on the physical SOS button click to securely SMS user location data to localized emergency numbers.
- **n8n Webhooks:** A robust local/cloud automation wrapper used to silently bridge data payloads immediately to active police dashboards.

### 3. Intelligence Engine (Python)
- **Python 3 / Flask:** Provides the microservice endpoints called by the Node server.
- **BeautifulSoup / Selenium:** The backbone of the live **Web-Scraping Architecture**, silently pulling and parsing HTML blocks from news portals to ingest incident-strings.
- **GeoPandas & NumPy:** Handles the intense mathematical overhead required to match string-addresses to physical Polygons/Multipolygons (Tamil Nadu bounds), creating the Risk Heatmaps cleanly.

---

## 🚀 Local Deployment Setup (A-Z Guide)

> **Prerequisites:** Please ensure you have [Node 18+](https://nodejs.org/en) and [Python 3.10+](https://www.python.org/downloads/) permanently placed in your environment PATH.

### 1. Initialize the Environment Variables
Create a local `.env` inside the `/server` directory:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=your_db_password
DB_NAME=sih

# Twilio SMS Configs
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE=+1XXXXXXXXXX

# Firebase Config (Usually handled in client/src/firebase.js)
```

### 2. Start the Action Backend (Node)
This handles authentication, DB pulls, routing queries, and the SOS action API.
```bash
cd server
npm install
npm start
# Expected Output: "Server is running on Port 5000"
```

### 3. Start the Intelligence Engine (Python)
This instance actively processes the routing grids, web-scraping jobs, and Heatmap generations.
```bash
# Open a new terminal instance
cd client/TamilWards
pip install -r requirements.txt
python backend.py
# Expected Output: "Running on http://127.0.0.1:5001"
```

### 4. Execute the Frontend Web Client
The React 18 client binds all API modules together on port 5173.
```bash
# Open a third terminal instance
cd client
npm install
npm run dev
# Expected Output: "Local: http://localhost:5173/"
```

### 5. Access
Navigate to [http://localhost:5173](http://localhost:5173) in your Chrome browser to view the application suite! 🗺️✨
