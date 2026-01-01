jsPlumb.ready(function () {

  const requiredPairs = [
  "pointA-pointP",
  "pointB-pointK",
  "pointB-pointY",
  "pointB-pointJ",
  "pointQ-pointL",
  "pointG-pointR",
  "pointE-pointM",
  "pointF-pointD",
  "pointH-pointI",
  "pointI-pointC",
  "pointC-pointH"
];

const requiredConnections = new Set(
  requiredPairs.map(p => p.split("-").sort().join("-"))
);
function connectRequiredPair(pair) {
  const [a, b] = pair.split("-");
  const epA = jsPlumb.getEndpoint(a);
  const epB = jsPlumb.getEndpoint(b);

  if (!epA || !epB) {
    console.warn("Missing endpoint for", pair);
    return;
  }

  jsPlumb.connect({
    sourceEndpoint: epA,
    targetEndpoint: epB,
    connector: ["Bezier", { curviness: 260 }],
    paintStyle: { strokeWidth: 4 }
  });
}




  /* =====================================================
     STATE
     ===================================================== */
  let connectionsAreCorrect = false;
  let isMCBOn = false;
  let starterIsOn = false;

  // ===== ROTOR STATE =====
let rotorAngle = 0;
let rotorInterval = null;

// ===== READINGS =====
let currentReading = 0;
let rpmReading = 0;

// ===== VOLTMETER CONTROL =====
const voltmeterNeedle = document.querySelector(".meter-needle3");


const VOLT_0_ANGLE = -70;   // 0V position
const VOLT_220_ANGLE =0; // 220V position

// Set needle instantly (NO animation)
function setVoltmeterZero() {
  if (!voltmeterNeedle) return;

  voltmeterNeedle.style.transition = "none";
  voltmeterNeedle.style.transform =
    `translate(-30%, -90%) rotate(${VOLT_0_ANGLE}deg)`;
}

// Move needle with animation (ONLY when knob is set)
function setVoltmeterTo220() {
  if (!voltmeterNeedle) return;

  voltmeterNeedle.style.transition = "transform 0.8s ease-in-out";
  voltmeterNeedle.style.transform =
    `translate(-30%, -90%) rotate(${VOLT_220_ANGLE}deg)`;
}




  // ===== Armature rheostat (nob2) state =====
let armatureKnobUsed = false;
let isAdjustingKnob2 = false;
let knob2StartX = 0;
let knob2StartLeft = 0;

// ===== FIELD RHEOSTAT (7 STEP CONTROL) =====
const knob1 = document.querySelector(".nob1");
const fieldRheostat = document.querySelector(".rheostat-img-1");
let FIELD_POSITIONS = [];
// ===== FIELD RHEOSTAT DRAG LOGIC (ADD HERE) =====
if (knob1) {
 knob1.addEventListener("mousedown", function (e) {

  if (!fieldKnobEnabled) {
    alert("Set armature resistance first");
    return;
  }

  isDraggingFieldKnob = true;
  fieldStartX = e.clientX;

  // ✅ CRITICAL FIX — sync starting index
  fieldStepIndex = FIELD_POSITIONS.indexOf(
    parseInt(knob1.style.left)
  );

  knob1.style.cursor = "grabbing";

  document.addEventListener("mousemove", dragFieldKnob);
  document.addEventListener("mouseup", stopFieldKnobDrag);

  e.preventDefault();
});

}

function dragFieldKnob(e) {
  if (!isDraggingFieldKnob) return;

  const deltaX = e.clientX - fieldStartX;

  const stepWidth =
    (FIELD_POSITIONS[FIELD_POSITIONS.length - 1] - FIELD_POSITIONS[0]) / 7;

let stepChange = Math.floor((deltaX + stepWidth / 2) / stepWidth);
let newIndex = fieldStepIndex + stepChange;


newIndex = Math.max(0, Math.min(7, newIndex));



  knob1.style.left = FIELD_POSITIONS[newIndex] + "px";
}

function stopFieldKnobDrag() {
  if (!isDraggingFieldKnob) return;

  isDraggingFieldKnob = false;
  document.removeEventListener("mousemove", dragFieldKnob);
  document.removeEventListener("mouseup", stopFieldKnobDrag);

  fieldStepIndex = FIELD_POSITIONS.indexOf(
    parseInt(knob1.style.left)
  );
  knob1.style.cursor = "grab";
    // ===== UPDATE AMMETER ON FIELD DIVISION CHANGE =====
if (fieldStepIndex >= 1 && fieldStepIndex <= 7) {

  // ----- CURRENT -----
  currentReading = FIELD_AMMETER_VALUES[fieldStepIndex];
  setAmmeterCurrent(currentReading);

  // ----- RPM -----
  rpmReading = FIELD_RPM_VALUES[fieldStepIndex];

  // ----- ROTOR -----
  startRotorRotation();
}

}




let fieldStepIndex = 0;
let fieldKnobEnabled = false;
let isDraggingFieldKnob = false;
let fieldStartX = 0;
let fieldStartLeft = 0;


// Adjust these two values ONCE to match rod ends
const ARM_ROD_MIN_X = 20;   // left end of green coil
const ARM_ROD_MAX_X = 240;  // right end of green coil

  const mcbImg = document.getElementById("mcbToggle");
  const starterHandle = document.querySelector(".starter-handle");
  const resetBtn = document.getElementById("resetBtn");
  const knob2 = document.getElementById("nob2");
  const addTableBtn = document.getElementById("addTableBtn");
  const observationBody = document.getElementById("observationBody");
  const obsCurrentInput = document.getElementById("obsCurrent");
  const obsSpeedInput = document.getElementById("obsSpeed");


// ===== AMMETER CONTROL =====
const ammeterNeedle = document.querySelector(".meter-needle1");


// Ammeter angles for each field rheostat division (index 1 → 7)
const FIELD_AMMETER_VALUES = [
  null,   // index 0 (reference, not counted)
  0.48,   // division 1
  0.44,   // division 2
  0.40,   // division 3
  0.38,   // division 4
  0.32,   // division 5
  0.30,   // division 6
  0.28    // division 7
];

const FIELD_RPM_VALUES = [
  null,   // index 0 (not used)
  1100,   // division 1
  1130,   // division 2
  1153,   // division 3
  1192,    // division 4
  1222,    // division 5
  1263,    // division 6
  1312     // division 7
];
// ===== VISUAL ROTOR SPEED PER FIELD DIVISION =====
const FIELD_ROTATION_SPEED = [
  null,  // index 0 not used
  3,   // Division 1 → very slow
  5,   // Division 2
  7,   // Division 3
  9,   // Division 4
  11,   // Division 5
  15,   // Division 6
  17.0   // Division 7 → fastest
];

function startRotorRotation() {

  const rotor = document.getElementById("gr");
  if (!rotor) return;

  const speed = FIELD_ROTATION_SPEED[fieldStepIndex];
  if (!speed) return;

  stopRotorRotation();

  rotorInterval = setInterval(() => {
    rotorAngle += speed;
    rotor.style.transform = `rotate(${rotorAngle}deg)`;
  }, 1000 / 60);
}


function stopRotorRotation() {
  if (rotorInterval) {
    clearInterval(rotorInterval);
    rotorInterval = null;
  }
}

// Map current (0–0.5A) to needle angle (adjust if needed)
function setAmmeterCurrent(current) {
  if (!ammeterNeedle) return;
 const MIN_ANGLE = -70;  // 0 A (left)
const MID_ANGLE = 0;    // 0.5 A (center)
const MAX_ANGLE = 90;   // 1 A (right)


  const angle = MIN_ANGLE + (current / 1) * (MAX_ANGLE - MIN_ANGLE);

  ammeterNeedle.style.transition = "transform 0.4s ease-in-out";
  ammeterNeedle.style.transform = `rotate(${angle}deg)`;

}



  /* =====================================================
     STARTER SEMICIRCLE CONFIG (DO NOT CHANGE)
     ===================================================== */
  const START_LEFT = 16.67;
  const END_LEFT = 68;
  const BASE_TOP = 37.04;
  const ARC_HEIGHT = 15;

  let isDragging = false;
  let dragStartX = 0;

  function updateStarterPosition(t) {
    if (!starterHandle) return;
    const left = START_LEFT + t * (END_LEFT - START_LEFT);
    const top = BASE_TOP - ARC_HEIGHT * Math.sin(t * Math.PI);
    starterHandle.style.left = left + "%";
    starterHandle.style.top = top + "%";
  }

  /* =====================================================
     INITIAL STARTER STATE
     ===================================================== */
  if (starterHandle) {
    updateStarterPosition(0);
    starterHandle.classList.add("disabled");
  }

  /* =====================================================
     STARTER DRAG LOGIC
     ===================================================== */
  if (starterHandle) {
    starterHandle.addEventListener("mousedown", function (e) {
// 🚫 Starter already ON → do nothing
  if (starterIsOn) {
    e.preventDefault();
    return;
  }
      if (!connectionsAreCorrect) {
        alert("Complete connections first");
        return;
      }
      if (!isMCBOn) {
        alert("Turn ON MCB first");
        return;
      }

      isDragging = true;
      dragStartX = e.clientX;
      starterHandle.style.cursor = "grabbing";

      document.addEventListener("mousemove", dragStarter);
      document.addEventListener("mouseup", stopDragStarter);
      e.preventDefault();
    });
  }

  function dragStarter(e) {
    if (!isDragging || !starterHandle) return;

    const deltaX = e.clientX - dragStartX;
    const parentWidth = starterHandle.parentElement.offsetWidth;

    let t = deltaX / parentWidth;
    t = Math.max(0, Math.min(1, t));

    updateStarterPosition(t);
  }

  function stopDragStarter() {
    if (!isDragging || !starterHandle) return;

    isDragging = false;
    document.removeEventListener("mousemove", dragStarter);
    document.removeEventListener("mouseup", stopDragStarter);

    const currentLeft = parseFloat(starterHandle.style.left);
    const t = (currentLeft - START_LEFT) / (END_LEFT - START_LEFT);

    if (t > 0.5) {
      updateStarterPosition(1);
      starterIsOn = true;
    } else {
      updateStarterPosition(0);
      starterIsOn = false;
    }

    starterHandle.style.cursor = "pointer";

    // Field knob disabled at start
if (knob1) {
  knob1.style.cursor = "not-allowed";
}

  }
/* =====================================================
   ARMATURE RHEOSTAT (nob2) SLIDER LOGIC
   ===================================================== */
if (knob2) {
  knob2.addEventListener("mousedown", function (e) {

    // Starter must be ON
    if (!starterIsOn) {
      alert("Turn ON starter first");
      return;
    }

    // Allow only once
    if (armatureKnobUsed) {
      alert("Armature resistance already set");
      return;
    }

    isAdjustingKnob2 = true;
    knob2StartX = e.clientX;
    knob2StartLeft = knob2.offsetLeft;

    knob2.style.cursor = "grabbing";

    document.addEventListener("mousemove", dragArmatureKnob);
    document.addEventListener("mouseup", stopArmatureKnob);

    e.preventDefault();
  });
}
function dragArmatureKnob(e) {
  if (!isAdjustingKnob2) return;

  const deltaX = e.clientX - knob2StartX;
  let newLeft = knob2StartLeft + deltaX;

  // Limit movement to rheostat rod
  newLeft = Math.max(ARM_ROD_MIN_X, Math.min(ARM_ROD_MAX_X, newLeft));

  knob2.style.left = newLeft + "px";
}
function calculateFieldPositions() {
  if (!knob1 || !fieldRheostat) return;

  const knobWidth = knob1.offsetWidth;

  // ✅ GREEN COIL LIMITS (adjust ONLY these if needed)
  const GREEN_START = 23;
  const GREEN_END = 230;

  const minX = GREEN_START;
  const maxX = GREEN_END - knobWidth;

  FIELD_POSITIONS = [];

  for (let i = 0; i < 8; i++) {
    const pos = minX + (i * (maxX - minX)) / 7;
    FIELD_POSITIONS.push(Math.round(pos));
  }

  knob1.style.left = FIELD_POSITIONS[0] + "px";
  knob1.style.cursor = "not-allowed";
}

function stopArmatureKnob() {

  if (!isAdjustingKnob2) return;

  isAdjustingKnob2 = false;

  document.removeEventListener("mousemove", dragArmatureKnob);
  document.removeEventListener("mouseup", stopArmatureKnob);

  armatureKnobUsed = true;
  knob2.style.cursor = "not-allowed";
  setVoltmeterTo220();

  alert("Armature resistance set");
  fieldKnobEnabled = true;
}


  /* =====================================================
     MCB LOGIC
     ===================================================== */
  if (mcbImg) {
    mcbImg.style.cursor = "pointer";

    mcbImg.addEventListener("click", function () {

      if (isMCBOn) {
        // TURN OFF
        isMCBOn = false;
        starterIsOn = false;
        mcbImg.src = "images/mcb-off.png";

        if (starterHandle) {
          updateStarterPosition(0);
          starterHandle.classList.add("disabled");
        }
        stopRotorRotation();
rotorAngle = 0;

const rotor = document.getElementById("gr");
if (rotor) rotor.style.transform = "rotate(0deg)";

        return;
      }

      if (!connectionsAreCorrect) {
        alert("Please complete correct connections first");
        setVoltmeterZero();

        return;

        stopRotorRotation();
rotorAngle = 0;

const rotor = document.getElementById("gr");
if (rotor) rotor.style.transform = "rotate(0deg)";

      }
// Reset armature rheostat
armatureKnobUsed = false;
if (knob2) {
  knob2.style.left = ARM_ROD_MIN_X + "px";
  knob2.style.cursor = "pointer";
}

      // TURN ON
      isMCBOn = true;
      mcbImg.src = "images/mcb-on.png";

      if (starterHandle) {
        starterHandle.classList.remove("disabled");
      }
    });
  }

  /* =====================================================
     jsPlumb ENDPOINTS
     ===================================================== */
  const ringSvg =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26">
        <circle cx="13" cy="13" r="12" fill="black"/>
        <circle cx="13" cy="13" r="9" fill="#ba8d5f"/>
        <circle cx="13" cy="13" r="6" fill="black"/>
      </svg>
    `);

  const baseEndpointOptions = {
    endpoint: ["Image", { url: ringSvg, width: 26, height: 26 }],
    isSource: true,
    isTarget: true,
    maxConnections: -1,
    connector: ["Bezier", { curviness: 160 }]
  };

  const container = document.querySelector(".top-row");
  if (container) jsPlumb.setContainer(container);

  // Keep endpoints/wires glued to their elements on zoom/resize
  const repaintPlumb = () => jsPlumb.repaintEverything();
  window.addEventListener("resize", repaintPlumb);

  if (container && "ResizeObserver" in window) {
    const observer = new ResizeObserver(repaintPlumb);
    observer.observe(container);
  }

  const anchors = {
    pointA: [1, 0.5, 1, 0],
    pointB: [0, 0.5, -1, 0],

    pointP: [0, 0.5, -1, 0],
    pointQ: [0, 0.5, -1, 0],
    pointR: [0, 0.5, -1, 0],

    pointI: [0, 0.5, -1, 0],
    pointJ: [0, 0.5, -1, 0],
    pointL: [0, 0.5, -1, 0],
    pointM: [0, 0.5, -1, 0],

    pointC: [0, 0.5, -1, 0],
    pointD: [0, 0.5, -1, 0],

    pointK: [0, 0.5, -1, 0],
    pointY: [0, 0.5, -1, 0],

    pointE: [0, 0.5, -1, 0],
    pointF: [0, 0.5, -1, 0],

    pointG: [0, 0.5, -1, 0],
    pointH: [0, 0.5, -1, 0]
  };

  Object.keys(anchors).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const isLeft = anchors[id][0] === 0;
    jsPlumb.addEndpoint(el, {
      anchor: anchors[id],
      uuid: id
    }, {
      ...baseEndpointOptions,
      connectorStyle: {
        stroke: isLeft ? "blue" : "red",
        strokeWidth: 4
      }
    });
  });

  jsPlumb.bind("connection", function (info) {
    const isLeft = anchors[info.sourceId]?.[0] === 0;
    info.connection.setPaintStyle({
      stroke: isLeft ? "blue" : "red",
      strokeWidth: 4
    });
  });
const buttonToEndpointMap = {
  "point-A": "pointA",
  "point-B": "pointB",

  "point-P": "pointP",
  "point-Q": "pointQ",
  "point-R": "pointR",

  "point-I": "pointI",
  "point-J": "pointJ",
  "point-L": "pointL",
  "point-M": "pointM",

  "point-C": "pointC",
  "point-D": "pointD",

  "point-K": "pointK",
  "point-Y": "pointY",

  "point-E": "pointE",
  "point-F": "pointF",

  "point-G": "pointG",
  "point-H": "pointH"
};
function removeConnectionsOfEndpoint(endpointUUID) {

  // Remove connections where endpoint is SOURCE
  jsPlumb.getConnections({ source: endpointUUID })
    .forEach(conn => jsPlumb.deleteConnection(conn));

  // Remove connections where endpoint is TARGET
  jsPlumb.getConnections({ target: endpointUUID })
    .forEach(conn => jsPlumb.deleteConnection(conn));

  jsPlumb.repaintEverything();
}
Object.keys(buttonToEndpointMap).forEach(buttonClass => {

  const button = document.querySelector("." + buttonClass);
  if (!button) return;

  button.addEventListener("click", function (e) {
    e.stopPropagation(); // important

    const endpointUUID = buttonToEndpointMap[buttonClass];

    removeConnectionsOfEndpoint(endpointUUID);

    // Once a wire is removed, system is no longer correct
    connectionsAreCorrect = false;
    starterIsOn = false;

    // If MCB was ON, turn it OFF
    if (isMCBOn) {
      isMCBOn = false;
      mcbImg.src = "images/mcb-off.png";

      if (starterHandle) {
        updateStarterPosition(0);
        starterHandle.classList.add("disabled");
      }
    }
  });
});

  /* =====================================================
     CHECK CONNECTIONS
     ===================================================== */
const checkBtn = Array.from(
  document.querySelectorAll(".pill-btn")
).find(btn => btn.textContent.trim() === "Check Connections");

if (checkBtn) {
  checkBtn.addEventListener("click", function () {

    const result = validateConnections();

    if (result.status === "correct") {
      connectionsAreCorrect = true;
      alert("Connections are correct ✅");
    }

    else if (result.status === "missing") {
      connectionsAreCorrect = false;
      const [a, b] = result.connection.split("-");
      alert(`Missing connection: ${a.replace("point","")} → ${b.replace("point","")}`);
    }

    else if (result.status === "wrong") {
      connectionsAreCorrect = false;
      const [a, b] = result.connection.split("-");
      alert(`Wrong connection ❌: ${a.replace("point","")} → ${b.replace("point","")}`);
    }

  });
}

function validateConnections() {
  const currentConnections = jsPlumb.getAllConnections();

  const currentSet = new Set(
    currentConnections.map(conn =>
      [conn.sourceId, conn.targetId].sort().join("-")
    )
  );

  // 1️⃣ Check for missing required connections
  for (let req of requiredConnections) {
    if (!currentSet.has(req)) {
      return {
        status: "missing",
        connection: req
      };
    }
  }

  // 2️⃣ Check for extra / wrong connections
  for (let cur of currentSet) {
    if (!requiredConnections.has(cur)) {
      return {
        status: "wrong",
        connection: cur
      };
    }
  }

  // 3️⃣ All correct
  return {
    status: "correct"
  };
}


const autoConnectBtn = Array.from(
  document.querySelectorAll(".pill-btn")
).find(btn => btn.textContent.trim() === "Auto Connect");

if (autoConnectBtn) {
  autoConnectBtn.addEventListener("click", function () {

    // Remove existing wires
    if (typeof jsPlumb.deleteEveryConnection === "function") {
      jsPlumb.deleteEveryConnection();
    } else {
      jsPlumb.getAllConnections().forEach(c => jsPlumb.deleteConnection(c));
    }

    // Create required connections
    requiredPairs.forEach(pair => connectRequiredPair(pair));

    jsPlumb.repaintEverything();
    connectionsAreCorrect = true;

  });
}

  /* =====================================================
     OBSERVATION TABLE
     ===================================================== */
  function resetObservationTable() {
    if (observationBody) {
      observationBody.innerHTML = `
        <tr class="placeholder-row">
          <td colspan="3">No readings added yet.</td>
        </tr>
      `;
    }
    if (obsCurrentInput) obsCurrentInput.value = "";
    if (obsSpeedInput) obsSpeedInput.value = "";
  }

function addObservationRow() {

  if (currentReading === 0 || rpmReading === 0) {
    alert("Set field resistance to get readings first");
    return;
  }

  const placeholder = observationBody.querySelector(".placeholder-row");
  if (placeholder) placeholder.remove();

  const serial = observationBody.querySelectorAll("tr").length + 1;

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${serial}</td>
    <td>${currentReading.toFixed(2)}</td>
    <td>${rpmReading}</td>
  `;

  observationBody.appendChild(row);
}


  if (addTableBtn) {
    addTableBtn.addEventListener("click", addObservationRow);
  }

  /* =====================================================
     RESET
     ===================================================== */
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {

      if (typeof jsPlumb.deleteEveryConnection === "function") {
        jsPlumb.deleteEveryConnection();
      } else {
        jsPlumb.getAllConnections().forEach(c => jsPlumb.deleteConnection(c));
      }

      jsPlumb.repaintEverything();

      connectionsAreCorrect = false;
      isMCBOn = false;
      starterIsOn = false;

      if (mcbImg) mcbImg.src = "images/mcb-off.png";

      if (starterHandle) {
        updateStarterPosition(0);
        starterHandle.classList.add("disabled");
      }
      // Reset armature rheostat
armatureKnobUsed = false;
if (knob2) {
  knob2.style.left = ARM_ROD_MIN_X + "px";
  knob2.style.cursor = "pointer";
}
setVoltmeterZero();
resetObservationTable();
setAmmeterCurrent(0);
stopRotorRotation();
rotorAngle = 0;

const rotor = document.getElementById("gr");
if (rotor) rotor.style.transform = "rotate(0deg)";

    });
  }
// Voltmeter must ALWAYS start at 0V
setVoltmeterZero();
setTimeout(calculateFieldPositions, 100);
setAmmeterCurrent(0);

// ===== RESET FIELD RHEOSTAT =====
fieldKnobEnabled = false;
fieldStepIndex = 0;

if (knob1) {
  knob1.style.left = FIELD_POSITIONS[0] + "px";
  knob1.style.cursor = "not-allowed";
}
stopRotorRotation();
rotorAngle = 0;

const rotor = document.getElementById("gr");
if (rotor) rotor.style.transform = "rotate(0deg)";

});

