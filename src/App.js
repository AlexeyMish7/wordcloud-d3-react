import React, { Component } from "react";
import "./App.css";
import * as d3 from "d3";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { wordFrequency: [] };
  }
  componentDidMount() {
    this.renderChart();
  }

  componentDidUpdate() {
    this.renderChart();
  }

  getWordFrequency = (text) => {
    const stopWords = new Set([
      "the",
      "and",
      "a",
      "an",
      "in",
      "on",
      "at",
      "for",
      "with",
      "about",
      "as",
      "by",
      "to",
      "of",
      "from",
      "that",
      "which",
      "who",
      "whom",
      "this",
      "these",
      "those",
      "it",
      "its",
      "they",
      "their",
      "them",
      "we",
      "our",
      "ours",
      "you",
      "your",
      "yours",
      "he",
      "him",
      "his",
      "she",
      "her",
      "hers",
      "it",
      "its",
      "we",
      "us",
      "our",
      "ours",
      "they",
      "them",
      "theirs",
      "I",
      "me",
      "my",
      "myself",
      "you",
      "your",
      "yourself",
      "yourselves",
      "was",
      "were",
      "is",
      "am",
      "are",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "having",
      "do",
      "does",
      "did",
      "doing",
      "a",
      "an",
      "the",
      "as",
      "if",
      "each",
      "how",
      "which",
      "who",
      "whom",
      "what",
      "this",
      "these",
      "those",
      "that",
      "with",
      "without",
      "through",
      "over",
      "under",
      "above",
      "below",
      "between",
      "among",
      "during",
      "before",
      "after",
      "until",
      "while",
      "of",
      "for",
      "on",
      "off",
      "out",
      "in",
      "into",
      "by",
      "about",
      "against",
      "with",
      "amongst",
      "throughout",
      "despite",
      "towards",
      "upon",
      "isn't",
      "aren't",
      "wasn't",
      "weren't",
      "haven't",
      "hasn't",
      "hadn't",
      "doesn't",
      "didn't",
      "don't",
      "doesn't",
      "didn't",
      "won't",
      "wouldn't",
      "can't",
      "couldn't",
      "shouldn't",
      "mustn't",
      "needn't",
      "daren't",
      "hasn't",
      "haven't",
      "hadn't",
    ]);
    const words = text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=_`~()]/g, "")
      .replace(/\s{2,}/g, " ")
      .split(" ");
    const filteredWords = words.filter((word) => !stopWords.has(word));
    return Object.entries(
      filteredWords.reduce((freq, word) => {
        freq[word] = (freq[word] || 0) + 1;
        return freq;
      }, {})
    );
  };

  renderChart() {
    const data = this.state.wordFrequency
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    console.log(data);

    const width = 1000,
      height = 420;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const W = width - margin.left - margin.right;
    const H = height - margin.top - margin.bottom;

    const svg = d3
      .select(".svg_parent")
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .selectAll("g.wordcloud-container")
      .data([null])
      .join("g")
      .attr("class", "wordcloud-container")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (data.length === 0) {
      g.selectAll("text.word")
        .data([])
        .join((exit) => exit.remove());
      return;
    }

    // scales (linear per spec)
    const counts = data.map((d) => d[1]);
    const minC = d3.min(counts);
    const maxC = d3.max(counts);

    // moderate contrast
    const fontScale = d3.scaleLinear().domain([minC, maxC]).range([18, 110]);

    // rough text width estimator (px)
    const estWidth = (word, count) => fontScale(count) * 0.6 * word.length;

    // padding so the widest word never clips edges
    const widest = d3.max(data, (d) => estWidth(d[0], d[1])) || 0;
    const safePad = widest * 0.55 + 16; // half + a little breathing room

    // base linear x positions evenly spaced
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, data.length - 1)])
      .range([safePad, W - safePad]);

    const yCenter = H / 2;

    // compute non-overlapping x's from the base linear positions
    const minGap = 18;
    const xs = data.map((d, i) => xScale(i));
    const halfWs = data.map((d) => estWidth(d[0], d[1]) / 2);

    // left-to-right sweep to push words if overlapping
    for (let i = 1; i < xs.length; i++) {
      const leftEdgePrev = xs[i - 1] - halfWs[i - 1];
      const rightEdgePrev = xs[i - 1] + halfWs[i - 1];
      const leftEdgeCurr = xs[i] - halfWs[i];
      if (leftEdgeCurr < rightEdgePrev + minGap) {
        xs[i] = rightEdgePrev + minGap + halfWs[i]; // shift right just enough
      }
    }

    // if we drifted too far right, recentre within the canvas band
    const currentMid = (xs[0] + xs[xs.length - 1]) / 2;
    const targetMid = (safePad + (W - safePad)) / 2;
    const dx = targetMid - currentMid;
    for (let i = 0; i < xs.length; i++) xs[i] += dx;

    // data join (key by word)
    const words = g.selectAll("text.word").data(data, (d) => d[0]);

    // EXIT
    words.exit().transition().duration(300).style("opacity", 0).remove();

    // ENTER: final x, fixed y; animate FONT SIZE ONLY
    const enter = words
      .enter()
      .append("text")
      .attr("class", "word")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("x", (d, i) => xs[i])
      .attr("y", yCenter)
      .style("opacity", 1)
      .style("font-family", "sans-serif")
      .style("user-select", "none")
      .text((d) => d[0])
      .style("font-size", "0px");

    enter
      .transition()
      .duration(800)
      .style("font-size", (d) => `${fontScale(d[1])}px`);

    // UPDATE: animate BOTH x and font-size
    words
      .transition()
      .duration(800)
      .attr("x", (d, i) => xs[i])
      .attr("y", yCenter)
      .style("font-size", (d) => `${fontScale(d[1])}px`);
    // --- end word cloud drawing ---
  }

  render() {
    return (
      <div className="parent">
        <div className="child1" style={{ width: 1000 }}>
          <textarea
            type="text"
            id="input_field"
            style={{ height: 150, width: 1000 }}
          />
          <button
            type="submit"
            value="Generate Matrix"
            style={{ marginTop: 10, height: 40, width: 1000 }}
            onClick={() => {
              var input_data = document.getElementById("input_field").value;
              this.setState({
                wordFrequency: this.getWordFrequency(input_data),
              });
            }}
          >
            {" "}
            Generate WordCloud
          </button>
        </div>
        <div className="child2">
          <svg className="svg_parent"></svg>
        </div>
      </div>
    );
  }
}

export default App;
