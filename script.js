/* <===== Animation Module =====> */

// 工具函数
const { PI, sin, cos, random } = Math;
const TAU = 2 * PI;
const range = (n, m = 0) =>
  Array(n)
    .fill(m)
    .map((i, j) => i + j);
const map = (value, sMin, sMax, dMin, dMax) =>
  dMin + ((value - sMin) / (sMax - sMin)) * (dMax - dMin);
const polar = (ang, r = 1, [x = 0, y = 0] = []) => [
  x + r * cos(ang),
  y + r * sin(ang)
];

// D3 容器
const container = d3.select("#container");

// 设置样式和属性的工具
const setStyle = (el, attrs) =>
  Object.entries(attrs).reduce((acc, [key, val]) => acc.style(key, val), el);
const setAttrs = (el, attrs) =>
  Object.entries(attrs).reduce((acc, [key, val]) => acc.attr(key, val), el);

// 六边形裁剪路径
const clipCords = range(6).map((i) => {
  const ang = map(i, 0, 6, 0, TAU);
  return polar(ang + PI / 2, 50);
});
const clipPathD = `M${[...clipCords, clipCords[0]]
  .map(([x, y]) => `L${x},${y}`)
  .join("")
  .slice(1)}`;

// 初始化 SVG 和裁剪路径（只初始化一次）
const svgRoot = container.append("svg");
setAttrs(svgRoot, { width: "0px", height: "0px" });
const defs = svgRoot.append("defs");
const clipPath = defs.append("clipPath");
setAttrs(clipPath, { id: "clipPath" });
const clipPathPath = clipPath.append("path");
setAttrs(clipPathPath, { d: clipPathD });

// 元素容器（只存放元素，不影响 SVG/defs）
const elementsContainer = container
  .append("div")
  .attr("id", "elements-container")
  .style("position", "relative");

// 原子动画类
class Atom {
  constructor(parent, color) {
    this.element = parent.append("circle");
    setAttrs(this.element, { cx: 0, cy: 0, r: 4, fill: `${color}88` });
    this.seed1 = random() * TAU;
    this.seed2 = random() * TAU;
  }
  updatePosition(t) {
    const cx = 25 * sin(this.seed1 + t);
    const cy = 25 * sin(this.seed2 + t);
    setAttrs(this.element, { cx, cy });
  }
}

// 元素类
class Element {
  constructor(x, y, name, number, boil, melt, color) {
    this.root = elementsContainer.append("div");
    setStyle(this.root, {
      width: "5vw",
      height: "5vw",
      transform: `translate(${x}vw, ${y}vw)`,
      position: "absolute"
    });

    // 相态判断
    if (T <= melt) this.phase = "Solid";
    else if (T <= boil) this.phase = "Liquid";
    else this.phase = "Gas";

    // SVG 结构
    this.svg = this.root.append("svg");
    setAttrs(this.svg, { viewBox: "0 0 100 100", class: "svg" });
    this.group = this.svg.append("g");
    setAttrs(this.group, { transform: "translate(50,50)" });

    // 边框
    this.border = this.group.append("path");
    setAttrs(this.border, { d: clipPathD, fill: "none", stroke: `${color}88` });

    // 固态
    if (this.phase === "Solid") {
      this.solid = this.group.append("rect");
      setAttrs(this.solid, {
        x: -50,
        y: 18,
        width: 100,
        height: 60,
        fill: `${color}88`,
        style: "clip-path: url(#clipPath)"
      });
    }

    // 液态
    if (this.phase === "Liquid") {
      this.liquidPathA = this.group.append("path");
      setAttrs(this.liquidPathA, {
        d: "",
        fill: `${color}88`,
        style: "clip-path: url(#clipPath)"
      });
      this.liquidPathB = this.group.append("path");
      setAttrs(this.liquidPathB, {
        d: "",
        fill: `${color}44`,
        style: "clip-path: url(#clipPath)"
      });
    }

    // 气态
    if (this.phase === "Gas") {
      this.atoms = range(5).map(() => new Atom(this.group, color));
    }

    // 元素名与编号
    this.name = this.root.append("div").text(name);
    setAttrs(this.name, { class: "element-name" });
    setStyle(this.name, { color: `${color}88` });
    this.number = this.root.append("div").text(number);
    setAttrs(this.number, { class: "element-number" });
    setStyle(this.number, { color: `${color}88` });
  }

  update(t, path1, path2) {
    if (this.phase === "Liquid") {
      this.updateLiquid(path1, path2);
    }
    if (this.phase === "Gas") {
      this.updateAtoms(t);
    }
  }

  updateLiquid(path1, path2) {
    setAttrs(this.liquidPathA, { d: path1 });
    setAttrs(this.liquidPathB, { d: path2 });
  }

  updateAtoms(t) {
    this.atoms.forEach((atom) => {
      atom.updatePosition(t);
    });
  }
}

// 分类颜色
const categoryColors = {
  "diatomic nonmetal": "#3d7ea6",
  "noble gas": "#bc6ff1",
  "alkali metal": "#f05454",
  "alkaline earth metal": "#ffa36c",
  metalloid: "#64958f",
  "polyatomic nonmetal": "#8d93ab",
  "post-transition metal": "#c0e218",
  "transition metal": "#fcf876",
  lanthanide: "#949cdf",
  actinide: "#16697a"
};

// 创建所有元素
function createElements(data) {
  elementsContainer.html(""); // 清空旧元素
  elements = data.map((element) => {
    const category = element.category;
    const name = element.symbol;
    const number = element.number;
    const boil = element.boil;
    const melt = element.melt;
    const ix = element.xpos;
    const iy = element.ypos;
    const x = ix * 4.8 + ((iy + 1) % 2) * 2.5 - 2;
    const y = iy * 4.5 - 4;
    const color = categoryColors[category] || "#93abd3";
    return new Element(x, y, name, number, boil, melt, color);
  });
}

// 动画主循环
let step = 0;
function animate() {
  step = (step + 1) % 100;
  const t = map(step, 0, 100, 0, TAU);

  // 液态波浪曲线
  const curve1 = range(10)
    .map((i) => {
      const ang = map(i, 0, 10, 0, TAU);
      const x = map(i, 0, 10, -50, 50);
      const y = 10 + 4 * sin(ang + t);
      return `L${x},${y}`;
    })
    .join("");
  const curve2 = range(10)
    .map((i) => {
      const ang = map(i, 0, 10, 0, TAU);
      const x = map(i, 0, 10, -50, 50);
      const y = 10 + 6 * sin(ang + t + PI);
      return `L${x},${y}`;
    })
    .join("");
  const path1 = `M50,10L50,50L-50,50L-50,10${curve1}`;
  const path2 = `M50,10L50,50L-50,50L-50,10${curve2}`;

  // 更新所有元素
  elements.forEach((element) => {
    element.update(t, path1, path2);
  });

  requestAnimationFrame(animate);
}

// 重新绘制（温度变化时调用）
function redrawElements() {
  fetch("elements-data.json")
    .then((response) => response.json())
    .then((data) => {
      createElements(data.elements);
    });
}

// 默认温度
let T = 300;

// 初始化
fetch("elements-data.json")
  .then((response) => response.json())
  .then((data) => {
    createElements(data.elements);
    animate();
  });

/* <===== Audio Module =====> */

var debug = true; // 是否开启调试模式

// 获取麦克风音频并分析主要音调
async function getMicrophonePitch() {
    try {
        // 请求麦克风权限并获取音频流
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        // 将音频流连接到分析器
        source.connect(analyser);

        // 配置分析器
        analyser.fftSize = 2048;
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);

        function preprocessSignal(buffer) {
            const maxAmplitude = Math.max(...buffer.map(Math.abs));
            return buffer.map(sample => sample / maxAmplitude); // 归一化
        }

        // 用于计算主要音调的函数
        function yin(buffer, sampleRate) {
            const threshold = 0.1; // 阈值，用于判断是否找到音调
            const SIZE = buffer.length;
            const MAX_SAMPLES = Math.floor(SIZE / 2);
            let tau = 0;
        
            // 差分函数
            const difference = new Float32Array(MAX_SAMPLES);
            for (let t = 1; t < MAX_SAMPLES; t++) {
                for (let i = 0; i < MAX_SAMPLES; i++) {
                    difference[t] += Math.pow(buffer[i] - buffer[i + t], 2);
                }
            }
        
            // 累积平均归一化差分函数
            const cumulative = new Float32Array(MAX_SAMPLES);
            cumulative[0] = 1;
            for (let t = 1; t < MAX_SAMPLES; t++) {
                cumulative[t] = difference[t] / (difference.slice(1, t + 1).reduce((a, b) => a + b, 0) / t);
            }
        
            // 找到第一个低于阈值的 tau
            for (tau = 1; tau < MAX_SAMPLES; tau++) {
                if (cumulative[tau] < threshold) {
                    while (tau + 1 < MAX_SAMPLES && cumulative[tau + 1] < cumulative[tau]) {
                        tau++;
                    }
                    break;
                }
            }
        
            // 如果没有找到合适的 tau，返回 -1
            if (tau === MAX_SAMPLES || cumulative[tau] >= threshold) {
                return -1;
            }
        
            // 通过插值优化 tau
            const x0 = cumulative[tau - 1];
            const x1 = cumulative[tau];
            const x2 = cumulative[tau + 1];
            const betterTau = tau + (x2 - x0) / (2 * (2 * x1 - x2 - x0));
        
            // 计算频率
            return sampleRate / betterTau;
        }

        // 实时分析音频数据

        var pitches = [];
        function analyzePitch() {
            analyser.getFloatTimeDomainData(dataArray);
            const preprocessedData = preprocessSignal(dataArray);
            const pitch = yin(preprocessedData, audioContext.sampleRate);
            if (pitch !== -1) {
                if (!debug || pitch >= 300) { // !
                  pitches.push(pitch);
                  T = pitch; redrawElements();
                  console.log(`${Math.round(pitch)} Hz`);
                }
            } else if (pitches.length > 0) {
                var avgPitch = 0;
                for (let i = 0; i < pitches.length; i++) {
                    avgPitch += pitches[i];
                }
                avgPitch /= pitches.length;
                console.log(pitches.length);
                for (let i = 0; i < pitches.length; i++) {
                    if (pitches[i] - avgPitch > 1000 || avgPitch - pitches[i] > 100) {
                        pitches.splice(i, 1);
                        i--;
                    }
                }
                avgPitch = 0;
                for (let i = 0; i < pitches.length; i++) {
                    avgPitch += pitches[i];
                }
                avgPitch /= pitches.length;
                console.log(pitches.length);
                pitches = [];
                if (debug || pitches.length > 1) { // !
                  T = avgPitch; redrawElements();
                  console.log(`${Math.round(avgPitch)} Hz`);
                }
                console.log("Stop.");
            }
            requestAnimationFrame(analyzePitch);
        }

        analyzePitch();
    } catch (err) {
        console.error('无法访问麦克风:', err);
    }
}

// 调用函数
getMicrophonePitch();