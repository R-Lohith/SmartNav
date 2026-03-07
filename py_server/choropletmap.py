import os
import pandas as pd
import geopandas as gpd
import folium
from folium.plugins import MarkerCluster
import re
import sys

# Function to clean assembly name by removing bracketed text like (SC), (ST)
def clean_ac_name(ac_name):
    return re.sub(r"\s*\(.*?\)", "", str(ac_name)).strip()

# Step 1: Load Assembly GeoJSON polygon data
script_dir = os.path.dirname(os.path.abspath(__file__))
wards_gdf = gpd.read_file(os.path.join(script_dir, 'TAMIL NADU_ASSEMBLY.geojson'))  # Your geometry file

# Step 2: Load the safety score Excel and make points GeoDataFrame
df = pd.read_excel(os.path.join(script_dir, 'tn_enhanced_safety_analysis_20250915_122616.xlsx'))
points_gdf = gpd.GeoDataFrame(
    df,
    geometry=gpd.points_from_xy(df['Longitude'], df['Latitude']),
    crs=wards_gdf.crs
)

# Step 3: Merge Safety_Zone info to polygons based on DIST_NAME and AC_NAME
wards_gdf = wards_gdf.merge(
    df[['DIST_NAME', 'AC_NAME', 'Safety_Zone', 'Zone_Color']],
    on=['DIST_NAME', 'AC_NAME'],
    how='left'
)

# Step 4: Define color mapping function returning fill and border colors
def zone_color(zone):
    if pd.isna(zone):
        return ('#b7fbb7', '#67b267')  # Light green fill, darker green border
    elif zone == "Safe Zone":
        return ('#ffff99', '#999933')  # Light yellow fill, darker yellow border
    elif zone == "Moderate Zone":
        return ('#ffcc66', '#cc9933')  # Light orange fill, darker orange border
    else:
        return ('#ff6666', '#cc3333')  # Light red fill, darker red border

# Step 5: Initialize map
tamilnadu_map = folium.Map(
    location=[11.1271, 78.6569],
    zoom_start=7,
    attribution_control=False,
    zoom_control=False
)

# Inject CSS to hide attribution globally in the map
attribution_css = """
<style>
.leaflet-control-attribution { display: none !important; }
</style>
"""
tamilnadu_map.get_root().header.add_child(folium.Element(attribution_css))

# Step 6: Add colored polygons with tooltips
for _, row in wards_gdf.iterrows():
    ac_name = clean_ac_name(row.get('AC_NAME', '--'))
    dist_name = row.get('DIST_NAME', '--')
    fill_color, border_color = zone_color(row['Safety_Zone'])
    tooltip = f"{dist_name}<br>{ac_name}<br>Safety Zone: {row['Safety_Zone']}"
    folium.GeoJson(
        row['geometry'],
        style_function=lambda feature, fill_color=fill_color, border_color=border_color: {
            'fillColor': fill_color,
            'color': border_color,
            'weight': 1,
            'fillOpacity': 0.35  # Reduced concentration as requested
        },
        highlight_function=lambda x: {'weight': 2, 'color': 'blue'},
        tooltip=tooltip
    ).add_to(tamilnadu_map)

# Step 7: Add clustered markers
marker_cluster = MarkerCluster().add_to(tamilnadu_map)
for _, row in df.iterrows():
    clean_name = clean_ac_name(row['AC_NAME'])
    folium.Marker(
        location=[row['Latitude'], row['Longitude']],
        tooltip=f"{clean_name} ({row['DIST_NAME']}): {row['Safety_Zone']}",
        icon=folium.Icon(color='red', icon='shield', prefix='fa')
    ).add_to(marker_cluster)

# Step 8: Handle dynamic bounds if provided
if len(sys.argv) >= 5:
    try:
        f_lat, f_lon = float(sys.argv[1]), float(sys.argv[2])
        t_lat, t_lon = float(sys.argv[3]), float(sys.argv[4])
        # Zoom into the route area
        tamilnadu_map.fit_bounds([[f_lat, f_lon], [t_lat, t_lon]])

        # ALSO: Fetch and draw route here
        try:
            from generate_map import get_route_osrm
            route_coords, instructions = get_route_osrm(f_lat, f_lon, t_lat, t_lon)
            folium.PolyLine(route_coords, color='blue', weight=4, opacity=0.7).add_to(tamilnadu_map)
            
            # Add instructions panel
            steps_html = ""
            for idx, step in enumerate(instructions):
                steps_html += f"""
                <div style="padding: 10px; border-bottom: 1px solid #333; display: flex; gap: 10px;">
                    <div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; min-width: 20px;">{idx+1}</div>
                    <div style="color: #eee; font-size: 12px;">{step['text']} <br> <span style="font-size: 10px; color: #888;">{(step['distance']/1000):.2f} km</span></div>
                </div>
                """
            directions_panel_html = f"""
            <div id="directions-panel" style="position: fixed; top: 20px; left: 20px; width: 280px; max-height: 80vh; background: rgba(10, 10, 10, 0.9); backdrop-filter: blur(10px); border: 1px solid #333; border-radius: 12px; z-index: 1000; overflow-y: auto; display: none; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
                <div style="padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: white; font-size: 14px;">Navigation Log</strong>
                    <span onclick="this.parentElement.parentElement.style.display='none'" style="cursor: pointer; color: #888;">&times;</span>
                </div>
                <div style="padding: 5px;">{steps_html}</div>
            </div>
            <button onclick="var el=document.getElementById('directions-panel'); el.style.display=el.style.display==='none'?'block':'none'" style="position: fixed; bottom: 20px; left: 20px; z-index: 1000; padding: 12px 20px; background: #3b82f6; color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 12px rgba(59,130,246,0.4);">Show Directions</button>
            """
            tamilnadu_map.get_root().html.add_child(folium.Element(directions_panel_html))
        except Exception as e:
            print(f"Error adding route to choropleth: {e}")
    except:
        pass
else:
    # Default Bounds
    bounds = wards_gdf.total_bounds
    sw = [bounds[1], bounds[0]]
    ne = [bounds[3], bounds[2]]
    tamilnadu_map.fit_bounds([sw, ne])

# Inject JS to pull restricted areas from localStorage and draw them
restricted_js_code = """
<script>
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(() => {
        // find map instance on the window object
        let maps = Object.values(window).filter(v => v && v._layerAdd);
        if (maps.length > 0) {
            let map = maps[0];
            let data = null;
            try { data = localStorage.getItem("restrictedAreas"); } catch(e) {}
            if (!data) { try { data = window.parent.localStorage.getItem("restrictedAreas"); } catch(e) {} }
            
            if (data) {
                let areas = JSON.parse(data);
                areas.forEach(a => {
                    if (a.lat && a.lng) {
                        L.circleMarker([parseFloat(a.lat), parseFloat(a.lng)], {
                            radius: 12,
                            color: '#b824ff',
                            fillColor: '#b824ff',
                            fillOpacity: 0.8,
                            weight: 2
                        })
                        .bindTooltip("<strong style='color:#b824ff;'>⛔ RESTRICTED AREA</strong><br>Lat: " + a.lat + "<br>Lng: " + a.lng, {direction: 'top'})
                        .addTo(map);
                    }
                });
            }
        }
    }, 1500);
});
</script>
"""
tamilnadu_map.get_root().html.add_child(folium.Element(restricted_js_code))

# Step 9: Save the map
tamilnadu_map.save(os.path.join(script_dir, "../client/public/tamilnadu_safety_zone_choropleth.html"))

