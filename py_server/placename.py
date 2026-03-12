import pandas as pd
import os
import geopandas as gpd
import folium
from shapely.geometry import LineString
import requests
import re

def remove_sc_suffix(name):
    return re.sub(r"\s*\(.*?\)", "", name).strip()

def get_location_fuzzy(place, excel_file):
    df = pd.read_excel(excel_file)
    place_lower = place.strip().lower()
    # Prepare candidate names
    names = df['AC_NAME'].dropna().str.lower().tolist() + df['DIST_NAME'].dropna().str.lower().tolist()

    for candidate in names:
        if place_lower in candidate:
            # Pick first row with this match
            row = df[(df['AC_NAME'].str.lower() == candidate) | (df['DIST_NAME'].str.lower() == candidate)].iloc[0]
            return row['Latitude'], row['Longitude'], row['DIST_NAME'], row['AC_NAME']
    return None, None, None, None

def get_route_osrm(lat1, lon1, lat2, lon2, profile='driving'):
    url = (
        f"http://router.project-osrm.org/route/v1/{profile}/"
        f"{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson&steps=true"
    )
    resp = requests.get(url)
    if resp.status_code == 200:
        data = resp.json()
        route = data['routes'][0]
        coords = route['geometry']['coordinates']
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
        'Safe Zone': '#FFFF00',      # Yellow
        'Moderate Zone': '#FFA500',  # Orange
        'Risky Zone': '#FF0000'      # Red
    }
    df['Zone_Color'] = df['Zone'].map(color_map).fillna('#FFFFFF')
    return df

def generate_map(from_place, to_place, mode='car'):
    # Adjust paths as needed (assuming files in same dir)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_file = os.path.join(script_dir, 'tn_enhanced_safety_analysis_20250915_122616.xlsx')
    geojson_file = os.path.join(script_dir, 'TAMIL NADU_ASSEMBLY.geojson')

    profile_map = {
        'car': 'driving',
        'bus': 'driving',
        'train': 'driving',
        'bike': 'bicycle',
        'walk': 'foot'
    }
    profile = profile_map.get(mode, 'driving')

    from_lat, from_lon, from_dist, from_ac = get_location_fuzzy(from_place, excel_file)
    to_lat, to_lon, to_dist, to_ac = get_location_fuzzy(to_place, excel_file)

    if None in [from_lat, from_lon, to_lat, to_lon]:
        return "<html><body><h1>One or both places not found in the data. Please try again.</h1></body></html>"

    # Load GeoJSON and Excel
    wards = gpd.read_file(geojson_file)
    df = pd.read_excel(excel_file)
    df = categorize_zones(df)

    wards = wards.merge(df[['DIST_NAME', 'AC_NAME', 'Zone', 'Zone_Color']], on=['DIST_NAME', 'AC_NAME'], how='left')

    # Get route line
    route_coords, instructions = get_route_osrm(from_lat, from_lon, to_lat, to_lon, profile)
    route_line = LineString([(lon, lat) for lat, lon in route_coords])

    # Center map
    center_lat = (from_lat + to_lat) / 2
    center_lon = (from_lon + to_lon) / 2
    m = folium.Map(location=[center_lat, center_lon], zoom_start=7)

    # Fit map bounds
    bounds = wards.total_bounds
    sw = [bounds[1], bounds[0]]
    ne = [bounds[3], bounds[2]]
    m.fit_bounds([sw, ne])

    # Add polygons
    for idx, row in wards.iterrows():
        polygon = row['geometry']
        zone = row.get('Zone')
        zone_color = row.get('Zone_Color')
        if zone in ['Safe Zone', 'Moderate Zone', 'Risky Zone']:
            fill_color = zone_color
            fill_opacity = 0.6 if polygon.intersects(route_line) else 0.1
            line_color = '#000000' if polygon.intersects(route_line) else '#888888'
            line_weight = 1 if polygon.intersects(route_line) else 0.5
            tooltip = f"{row['DIST_NAME']} - {remove_sc_suffix(row['AC_NAME'])}" if polygon.intersects(route_line) else None
        else:
            fill_color = '#FFFFFF00'
            fill_opacity = 0
            line_color = '#FFFFFF00'
            line_weight = 0
            tooltip = None

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

    # Draw route
    folium.PolyLine(route_coords, color='blue', weight=5, opacity=0.8, tooltip='Route').add_to(m)

    # Start/end markers
    folium.Marker([from_lat, from_lon], tooltip=f"Start: {remove_sc_suffix(from_ac)} ({from_dist})", icon=folium.Icon(color='green')).add_to(m)
    folium.Marker([to_lat, to_lon], tooltip=f"End: {remove_sc_suffix(to_ac)} ({to_dist})", icon=folium.Icon(color='red')).add_to(m)

    # Return HTML string
    return m.get_root().render()