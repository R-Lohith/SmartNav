import pandas as pd
import geopandas as gpd
import folium
from shapely.geometry import LineString
import requests
import re
import os
import datetime

def remove_sc_suffix(name):
    return re.sub(r"\s*\(.*?\)", "", name).strip()

def get_location_fuzzy(place, excel_file):
    df = pd.read_excel(excel_file)
    place_lower = place.strip().lower()
    names = df['AC_NAME'].dropna().str.lower().tolist() + df['DIST_NAME'].dropna().str.lower().tolist()

    for candidate in names:
        if place_lower in candidate:
            row = df[(df['AC_NAME'].str.lower() == candidate) | (df['DIST_NAME'].str.lower() == candidate)].iloc[0]
            return row['Latitude'], row['Longitude'], row['DIST_NAME'], row['AC_NAME']
    return None, None, None, None

def get_route_osrm(lat1, lon1, lat2, lon2, profile='driving'):
    profile_map = {
        'car': 'driving',
        'bus': 'driving',
        'train': 'driving',
        'bike': 'bicycle',
        'walk': 'foot',
        'driving': 'driving',
        'foot': 'foot',
        'bicycle': 'bicycle'
    }
    osrm_profile = profile_map.get(profile, 'driving')
    url = f"http://router.project-osrm.org/route/v1/{osrm_profile}/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson&steps=true"
    resp = requests.get(url)
    if resp.status_code == 200:
        data = resp.json()
        route = data['routes'][0]
        coords = route['geometry']['coordinates']
        
        # Extract instructions (logs)
        instructions = []
        for leg in route.get('legs', []):
            for step in leg.get('steps', []):
                maneuver = step.get('maneuver', {})
                instruction = maneuver.get('instruction', 'Continue')
                name = step.get('name', '')
                distance = step.get('distance', 0)
                if name:
                    instruction += f" on {name}"
                instructions.append({
                    'text': instruction,
                    'distance': distance,
                    'maneuver': maneuver.get('type', 'step')
                })
                
        return [[lat, lon] for lon, lat in coords], instructions
    else:
        print(f"OSRM Error: Status {resp.status_code}, Response: {resp.text}")
        return [[lat1, lon1], [lat2, lon2]], []

def categorize_zones(df):
    q1 = df['Total_Crime_Count'].quantile(0.25)
    q2 = df['Total_Crime_Count'].quantile(0.5)
    q3 = df['Total_Crime_Count'].quantile(0.75)
    
    def zone_authoritative(count):
        if count <= q1:
            return 'Safe Zone'
        elif count <= q2:
            return 'Moderate Zone'
        else:
            return 'Risky Zone'
            
    df['Zone'] = df['Total_Crime_Count'].apply(zone_authoritative)
    
    color_map = {
        'Safe Zone': '#FFFF00',
        'Moderate Zone': '#FFA500',
        'Risky Zone': '#FF0000'
    }
    df['Zone_Color'] = df['Zone'].map(color_map).fillna('#FFFFFF')
    return df

def generate_map(from_place, to_place, mode='car', output_dir='../client/public'):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_file = os.path.join(script_dir, "tn_enhanced_safety_analysis_20250915_122616.xlsx")
    geojson_file = os.path.join(script_dir, "TAMIL NADU_ASSEMBLY.geojson")
    print(f"Loading files: {excel_file}, {geojson_file}")

    profile_map = {'car': 'driving', 'bus': 'driving', 'train': 'driving', 'bike': 'bicycle', 'walk': 'foot'}
    profile = profile_map.get(mode, 'driving')

    from_lat, from_lon, from_dist, from_ac = get_location_fuzzy(from_place, excel_file)
    to_lat, to_lon, to_dist, to_ac = get_location_fuzzy(to_place, excel_file)

    if None in [from_lat, from_lon, to_lat, to_lon]:
        return "error.html", "<html><body><h1>One or both places not found in the data. Please try again.</h1></body></html>"

    wards = gpd.read_file(geojson_file)
    df = pd.read_excel(excel_file)
    df = categorize_zones(df)

    wards = wards.merge(df[['DIST_NAME', 'AC_NAME', 'Zone', 'Zone_Color']], on=['DIST_NAME', 'AC_NAME'], how='left')

    route_coords, instructions = get_route_osrm(from_lat, from_lon, to_lat, to_lon, profile)
    route_line = LineString([(lon, lat) for lat, lon in route_coords])

    center_lat = (from_lat + to_lat) / 2
    center_lon = (from_lon + to_lon) / 2
    m = folium.Map(
        location=[center_lat, center_lon], 
        zoom_start=10,
        attribution_control=False,
        zoom_control=False
    )

    # Calculate sw, ne from route coordinates for tighter bounds
    route_lats = [c[0] for c in route_coords]
    route_lons = [c[1] for c in route_coords]
    sw = [min(route_lats), min(route_lons)]
    ne = [max(route_lats), max(route_lons)]
    m.fit_bounds([sw, ne])

    # Inject CSS to hide attribution globally in the map
    attribution_css = """
    <style>
    .leaflet-control-attribution { display: none !important; }
    </style>
    """
    m.get_root().header.add_child(folium.Element(attribution_css))

    for idx, row in wards.iterrows():
        polygon = row['geometry']
        zone = row.get('Zone')
        zone_color = row.get('Zone_Color')
        
        if zone in ['Safe Zone', 'Moderate Zone', 'Risky Zone']:
            # Highly conditional display: only show polygons if they intersect the route
            if polygon.intersects(route_line):
                fill_color = zone_color
                fill_opacity = 0.25 # Subdued concentration
                line_color = '#000000'
                line_weight = 1.5
                tooltip = f"{row['DIST_NAME']} - {remove_sc_suffix(row['AC_NAME'])}"
                
                folium.GeoJson(
                    polygon,
                    style_function=lambda feat, fc=fill_color, fo=fill_opacity, lc=line_color, lw=line_weight: {
                        'fillColor': fc,
                        'fillOpacity': fo,
                        'color': lc,
                        'weight': lw
                    },
                    tooltip=tooltip
                ).add_to(m)
        else:
            continue

    folium.PolyLine(route_coords, color='blue', weight=5, opacity=0.8, tooltip='Route').add_to(m)
    folium.Marker([from_lat, from_lon], tooltip=f"Start: {remove_sc_suffix(from_ac)} ({from_dist})", icon=folium.Icon(color='green', icon='play', prefix='fa')).add_to(m)
    folium.Marker([to_lat, to_lon], tooltip=f"End: {remove_sc_suffix(to_ac)} ({to_dist})", icon=folium.Icon(color='red', icon='flag-checkered', prefix='fa')).add_to(m)

    # Directions Floating Panel in HTML
    steps_html = ""
    for idx, step in enumerate(instructions):
        steps_html += f"""
        <div style="padding: 10px; border-bottom: 1px solid #333; display: flex; gap: 10px;">
            <div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; min-width: 20px;">{idx+1}</div>
            <div style="color: #eee; font-size: 12px;">{step['text']} <br> <span style="font-size: 10px; color: #888;">{(step['distance']/1000):.2f} km</span></div>
        </div>
        """

    directions_panel_html = f"""
    <div id="directions-panel" style="
        position: fixed; 
        top: 20px; 
        left: 20px; 
        width: 280px; 
        max-height: 80vh; 
        background: rgba(10, 10, 10, 0.9); 
        backdrop-filter: blur(10px);
        border: 1px solid #333;
        border-radius: 12px;
        z-index: 1000;
        overflow-y: auto;
        display: none;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    ">
        <div style="padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: white; font-size: 14px;">Navigation Log</strong>
            <span onclick="document.getElementById('directions-panel').style.display='none'" style="cursor: pointer; color: #888;">&times;</span>
        </div>
        <div style="padding: 5px;">
            {steps_html}
        </div>
    </div>
    <button onclick="var el=document.getElementById('directions-panel'); el.style.display=el.style.display==='none'?'block':'none'" style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 1000;
        padding: 12px 20px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 30px;
        cursor: pointer;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    ">
        Show Directions
    </button>
    """
    m.get_root().html.add_child(folium.Element(directions_panel_html))

    # Use a fixed filename instead of timestamped name
    filename = 'tamilnadu_route_map.html'
    full_path = os.path.join(output_dir, filename)

    # Ensure the directory exists
    os.makedirs(output_dir, exist_ok=True)
    m.save(full_path)  # This will overwrite the existing file if it exists

    return filename, m.get_root().render()