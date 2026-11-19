# Mabat: classroom quality from body movement

A research prototype that watches a kindergarten through a camera, **without sound**, and describes how the staff move, position themselves and interact with children and parents.

Open `gan/index.html` through any web server (camera access needs HTTPS or `localhost`). It has three sources:

- **Simulation**: a synthetic classroom with 3 staff, about 13 children, circle time, and parents dropping off and picking up. Use it to demo and test the analysis with no camera and no real children.
- **Camera**: live webcam analysis. The view is blurred by default.
- **Video file**: analyze recorded footage. Click an event to jump to that moment.

## How it works

1. **Pose detection**: MediaPipe Pose Landmarker runs in the browser and finds up to 12 skeletons (33 body points each) per frame. No faces are recognized, no audio is used, and nothing is uploaded or recorded.
2. **Tracking**: each person gets a temporary numeric ID, matched frame to frame by floor position and body size.
3. **Role classification**:
   - *Child vs. adult* comes from head-to-torso proportions (children's heads are relatively larger). This doesn't depend on distance from the camera.
   - *Parent vs. staff*: an adult who first appears inside an **Entrance** zone is treated as a parent.
   - Clicking a person changes their role manually.
4. **Metrics** (`engine.js`), with distances scaled by body size so they hold at any depth:

| Indicator | What is measured | Related framework |
|---|---|---|
| Eye level | Staff kneeling, sitting or crouching while near children | CLASS: teacher sensitivity |
| Proximity & engagement | Staff time within about 1.2 m of a child | CLASS: emotional support |
| Child coverage | Child-time spent near any staff member | ECERS: supervision |
| Facing the child | Staff body or face turned toward a nearby child | CLASS: regard for child perspective |
| Physical contact | Staff hand very close to a child's body | Warmth |
| Staff huddling | Staff together with no children nearby (lower is better) | ECERS: staff–child interaction |
| Small-group work | Children in groups of 2–5 vs. alone or whole group | CLASS: learning formats |
| Children alone | Child with no peers or staff nearby | Observation flag |
| Greeting parents | Parents who got at least 5 s near a staff member | Family partnership |
| Children per staff | Time-weighted ratio in frame | Structural |

The tool also produces a timestamped event log, heatmaps, user-drawn zones with time spent in each, a printable report, and CSV and JSON export for statistical analysis.

## Limitations (this is a prototype)

- The indicators are **descriptive proxies, not validated measures**. Validating them against CLASS or ECERS ratings made by trained observers is the obvious first study.
- Positions are measured in the image, not on a calibrated floor plan. A 4-point floor calibration (homography) would give real distances.
- Children who overlap or are hidden are missed. IDs can swap when people cross or leave the frame.
- The child/adult threshold may need tuning for each camera angle. Use *Settings → show score* to calibrate.
- Next steps for production: a stronger multi-person pose model (e.g. RTMPose or YOLO-pose), multiple cameras, re-identification across cameras, and an ethics/IRB-ready consent and data-retention flow.

## Files

- `engine.js`: tracking, role classification, metrics, events
- `sim.js`: classroom simulator that produces MediaPipe-format skeletons
- `app.js`: UI, sources (camera, file, simulation), drawing, report, export
- `index.html`, `gan.css`: layout and styles
