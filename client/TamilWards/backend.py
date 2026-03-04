from flask import Flask, request, jsonify
from generate_map import generate_map, get_route_osrm, get_location_fuzzy
import os, math
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Correct Excel path
script_dir = os.path.dirname(os.path.abspath(__file__))
excel_file = os.path.join(script_dir, "tn_enhanced_safety_analysis_20250915_122616.xlsx")

# ── Safety zone categorization (mirrors web.py logic) ──────────────────────
def categorize_zone(crime_count, q1, median, q3):
    if crime_count <= q1:   return "Safe Zone"
    elif crime_count <= median: return "Low Risk Zone"
    elif crime_count <= q3: return "Moderate Zone"
    else:                   return "High Risk Zone"

@app.route('/safety_data', methods=['GET'])
def get_safety_data():
    """Return all ward safety data as JSON for the monitoring dashboard."""
    try:
        if not os.path.exists(excel_file):
            return jsonify({"error": f"Excel file not found: {excel_file}"}), 500

        df = pd.read_excel(excel_file, sheet_name='Safety Analysis')

        # Compute quartiles for zone classification if column not present
        if 'Safety_Zone' not in df.columns:
            q1     = df['Total_Crime_Count'].quantile(0.25)
            median = df['Total_Crime_Count'].median()
            q3     = df['Total_Crime_Count'].quantile(0.75)
            df['Safety_Zone'] = df['Total_Crime_Count'].apply(
                lambda c: categorize_zone(c, q1, median, q3))

        # Drop rows without coordinates
        df = df.dropna(subset=['Latitude', 'Longitude'])

        # Fill optional columns
        for col in ['Crime_Index', 'Reference_Count', 'Primary_Sources']:
            if col not in df.columns:
                df[col] = 0 if col != 'Primary_Sources' else 'N/A'

        records = []
        for _, row in df.iterrows():
            lat = row['Latitude']
            lng = row['Longitude']
            if math.isnan(lat) or math.isnan(lng):
                continue
            records.append({
                "DIST_NAME":         str(row.get('DIST_NAME', '')),
                "AC_NAME":           str(row.get('AC_NAME', '')),
                "Latitude":          float(lat),
                "Longitude":         float(lng),
                "Total_Crime_Count": int(row.get('Total_Crime_Count', 0)),
                "Crime_Index":       float(row.get('Crime_Index', 0)),
                "Safety_Score":      float(row.get('Safety_Score', 0.5)),
                "Reference_Count":   int(row.get('Reference_Count', 0)),
                "Primary_Sources":   str(row.get('Primary_Sources', 'N/A')),
                "Safety_Zone":       str(row.get('Safety_Zone', 'Safe Zone')),
            })

        return jsonify(records), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate_route', methods=['GET'])
def gen_route():
    from_place = request.args.get('from')
    to_place = request.args.get('to')
    mode = request.args.get('mode', 'car')

    if not from_place or not to_place:
        return jsonify({"error": "Missing 'from' or 'to' parameters"}), 400

    # Check if Excel file exists
    if not os.path.exists(excel_file):
        return jsonify({"error": f"Excel file not found at {excel_file}"}), 500

    try:
        from_lat, from_lon, _, _ = get_location_fuzzy(from_place, excel_file)
        to_lat, to_lon, _, _ = get_location_fuzzy(to_place, excel_file)
    except Exception as e:
        return jsonify({"error": f"Failed to read Excel: {str(e)}"}), 500

    if None in [from_lat, from_lon, to_lat, to_lon]:
        return jsonify({"error": "One or both places not found in the data"}), 400

    # Get route
    try:
        route_coords, instructions = get_route_osrm(from_lat, from_lon, to_lat, to_lon, profile=mode)
        _, html = generate_map(from_place, to_place, mode)
    except Exception as e:
        return jsonify({"error": f"Route generation failed: {str(e)}"}), 500

    return jsonify({
        'html': html,
        'directions': route_coords,
        'instructions': instructions,
        'from': {'lat': from_lat, 'lng': from_lon, 'address': from_place},
        'to': {'lat': to_lat, 'lng': to_lon, 'address': to_place},
        'transportMode': mode,
        'duration': len(route_coords) * 0.5,  # Placeholder
        'distance': len(route_coords) * 0.1   # Placeholder
    }), 200


@app.route('/generate_and_save_route', methods=['GET'])
def generate_and_save_route():
    from_place = request.args.get('from')
    to_place = request.args.get('to')
    mode = request.args.get('mode', 'car')

    if not from_place or not to_place:
        return jsonify({"error": "Missing 'from' or 'to' parameters"}), 400

    try:
        from_lat, from_lon, _, _ = get_location_fuzzy(from_place, excel_file)
        to_lat, to_lon, _, _ = get_location_fuzzy(to_place, excel_file)
        
        if None in [from_lat, from_lon, to_lat, to_lon]:
            return jsonify({"error": "Locations not found"}), 400

        route_coords, instructions = get_route_osrm(from_lat, from_lon, to_lat, to_lon, profile=mode)
        filename, _ = generate_map(from_place, to_place, mode, '../public')
        
        return jsonify({
            "filename": filename,
            "directions": route_coords,
            "instructions": instructions,
            "from": {"lat": from_lat, "lng": from_lon, "address": from_place},
            "to": {"lat": to_lat, "lng": to_lon, "address": to_place},
            "duration": len(route_coords) * 0.5,
            "distance": len(route_coords) * 0.1
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate map: {str(e)}"}), 500

@app.route('/generate_choropleth', methods=['GET'])
def generate_choropleth():
    from_place = request.args.get('from')
    to_place = request.args.get('to')
    
    try:
        f_lat, f_lon, _, _ = get_location_fuzzy(from_place, excel_file)
        t_lat, t_lon, _, _ = get_location_fuzzy(to_place, excel_file)
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        choropleth_script = os.path.join(script_dir, "choropletmap.py")
        
        if all([f_lat, f_lon, t_lat, t_lon]):
            os.system(f"python {choropleth_script} {f_lat} {f_lon} {t_lat} {t_lon}")
        else:
            os.system(f"python {choropleth_script}")
            
        return jsonify({"message": "Safety choropleth generated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(port=5001, debug=True)
