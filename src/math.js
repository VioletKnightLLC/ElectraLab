const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

function shuffledOptions(answer, distractors) {
  const options = [...new Set([answer, ...distractors])].slice(0, 4)
  let variation = 1
  while (options.length < 4) {
    const fallback = `${answer} + ${variation++}`
    if (!options.includes(fallback)) options.push(fallback)
  }
  return options.sort(() => Math.random() - 0.5)
}

function ohmsLawProblem(level) {
  const type = randomInt(1, 3)
  if (type === 1) {
    const V = randomInt(3, 12 + level * 3)
    const R = randomInt(2, 10 + level * 5)
    const I = V / R
    const answer = `${formatNumber(I)} A`
    return {
      skill: "Ohm's Law",
      prompt: 'Find the current',
      expression: `V = ${V} V, R = ${R} Ω`,
      mathLatex: String.raw`V = ${V}\,\mathrm{V},\quad R = ${R}\,\Omega`,
      answer,
      options: shuffledOptions(answer, [`${formatNumber(I + 0.5)} A`, `${formatNumber(I + 1)} A`, `${formatNumber(Math.max(0.1, I - 0.5))} A`]),
      steps: [
        `Use Ohm's Law: $I = V / R$.`,
        `Substitute: $I = ${V} / ${R}$.`,
        `The current is $${answer}$.`,
      ],
    }
  } else if (type === 2) {
    const I = randomInt(1, 3 + level)
    const R = randomInt(5, 20 + level * 10)
    const V = I * R
    const answer = `${V} V`
    return {
      skill: "Ohm's Law",
      prompt: 'Find the voltage',
      expression: `I = ${I} A, R = ${R} Ω`,
      mathLatex: String.raw`I = ${I}\,\mathrm{A},\quad R = ${R}\,\Omega`,
      answer,
      options: shuffledOptions(answer, [`${V + randomInt(1, 5)} V`, `${V + randomInt(6, 10)} V`, `${Math.max(1, V - randomInt(1, 5))} V`]),
      steps: [
        `Use Ohm's Law: $V = I \\times R$.`,
        `Substitute: $V = ${I} \\times ${R}$.`,
        `The voltage is $${answer}$.`,
      ],
    }
  } else {
    const V = randomInt(6, 24 + level * 6)
    const I = randomInt(1, 4 + level)
    const R = V / I
    const answer = `${formatNumber(R)} Ω`
    return {
      skill: "Ohm's Law",
      prompt: 'Find the resistance',
      expression: `V = ${V} V, I = ${I} A`,
      mathLatex: String.raw`V = ${V}\,\mathrm{V},\quad I = ${I}\,\mathrm{A}`,
      answer,
      options: shuffledOptions(answer, [`${formatNumber(R + 1)} Ω`, `${formatNumber(R + 2)} Ω`, `${formatNumber(Math.max(1, R - 1))} Ω`]),
      steps: [
        `Use Ohm's Law: $R = V / I$.`,
        `Substitute: $R = ${V} / ${I}$.`,
        `The resistance is $${answer}$.`,
      ],
    }
  }
}

function powerProblem(level) {
  const type = randomInt(1, 3)
  if (type === 1) {
    const V = randomInt(5, 12 + level * 3)
    const I = randomInt(1, 3 + level)
    const P = V * I
    const answer = `${P} W`
    return {
      skill: 'Power',
      prompt: 'Find the power',
      expression: `V = ${V} V, I = ${I} A`,
      mathLatex: String.raw`V = ${V}\,\mathrm{V},\quad I = ${I}\,\mathrm{A}`,
      answer,
      options: shuffledOptions(answer, [`${P + randomInt(1, 5)} W`, `${P + randomInt(6, 15)} W`, `${Math.max(1, P - randomInt(1, 5))} W`]),
      steps: [
        `Use the power formula: $P = V \\times I$.`,
        `Substitute: $P = ${V} \\times ${I}$.`,
        `The power is $${answer}$.`,
      ],
    }
  } else if (type === 2) {
    const I = randomInt(1, 3 + level)
    const R = randomInt(5, 20 + level * 10)
    const P = I * I * R
    const answer = `${P} W`
    return {
      skill: 'Power',
      prompt: 'Find the power',
      expression: `I = ${I} A, R = ${R} Ω`,
      mathLatex: String.raw`I = ${I}\,\mathrm{A},\quad R = ${R}\,\Omega`,
      answer,
      options: shuffledOptions(answer, [`${P + randomInt(1, 10)} W`, `${P + randomInt(11, 25)} W`, `${Math.max(1, P - randomInt(1, 10))} W`]),
      steps: [
        `Use the power formula: $P = I^2 R$.`,
        `Substitute: $P = ${I}^2 \\times ${R}$.`,
        `The power is $${answer}$.`,
      ],
    }
  } else {
    const V = randomInt(5, 12 + level * 3)
    const R = randomInt(5, 20 + level * 10)
    const P = (V * V) / R
    const answer = `${formatNumber(P)} W`
    return {
      skill: 'Power',
      prompt: 'Find the power',
      expression: `V = ${V} V, R = ${R} Ω`,
      mathLatex: String.raw`V = ${V}\,\mathrm{V},\quad R = ${R}\,\Omega`,
      answer,
      options: shuffledOptions(answer, [`${formatNumber(P + 1)} W`, `${formatNumber(P + 2)} W`, `${formatNumber(Math.max(0.1, P - 1))} W`]),
      steps: [
        `Use the power formula: $P = V^2 / R$.`,
        `Substitute: $P = ${V}^2 / ${R}$.`,
        `The power is $${answer}$.`,
      ],
    }
  }
}

function seriesParallelProblem(level) {
  const type = randomInt(1, 3)
  if (type === 1) {
    const R1 = randomInt(2, 10 + level * 5)
    const R2 = randomInt(2, 10 + level * 5)
    const R3 = randomInt(2, 10 + level * 5)
    const Rtotal = R1 + R2 + R3
    const answer = `${Rtotal} Ω`
    return {
      skill: 'Series/Parallel',
      prompt: 'Find the equivalent resistance (series)',
      expression: `R₁ = ${R1} Ω, R₂ = ${R2} Ω, R₃ = ${R3} Ω`,
      mathLatex: String.raw`R_1 = ${R1}\,\Omega,\; R_2 = ${R2}\,\Omega,\; R_3 = ${R3}\,\Omega`,
      answer,
      options: shuffledOptions(answer, [`${Rtotal + randomInt(1, 5)} Ω`, `${Rtotal + randomInt(6, 15)} Ω`, `${Math.max(1, Rtotal - randomInt(1, 5))} Ω`]),
      steps: [
        `For series resistors: $R_{\\text{eq}} = R_1 + R_2 + R_3$.`,
        `Add them: $${R1} + ${R2} + ${R3} = ${Rtotal}$.`,
        `The equivalent resistance is $${answer}$.`,
      ],
    }
  } else if (type === 2) {
    const R1 = randomInt(2, 10 + level * 3)
    const R2 = randomInt(2, 10 + level * 3)
    const Rtotal = (R1 * R2) / (R1 + R2)
    const answer = `${formatNumber(Rtotal)} Ω`
    return {
      skill: 'Series/Parallel',
      prompt: 'Find the equivalent resistance (parallel)',
      expression: `R₁ = ${R1} Ω, R₂ = ${R2} Ω`,
      mathLatex: String.raw`R_1 = ${R1}\,\Omega,\; R_2 = ${R2}\,\Omega`,
      answer,
      options: shuffledOptions(answer, [`${formatNumber(Rtotal + 1)} Ω`, `${formatNumber(Rtotal + 2)} Ω`, `${formatNumber(Math.max(0.1, Rtotal - 1))} Ω`]),
      steps: [
        `For two parallel resistors: $R_{\\text{eq}} = \\frac{R_1 R_2}{R_1 + R_2}$.`,
        `Substitute: $R_{\\text{eq}} = \\frac{${R1} \\times ${R2}}{${R1} + ${R2}}$.`,
        `Calculate: $R_{\\text{eq}} = \\frac{${R1 * R2}}{${R1 + R2}} = ${answer}$.`,
      ],
    }
  } else {
    const R1 = randomInt(2, 8 + level * 2)
    const R2 = randomInt(2, 8 + level * 2)
    const R3 = randomInt(2, 8 + level * 2)
    const Rparallel = (R1 * R2) / (R1 + R2)
    const Rtotal = Rparallel + R3
    const answer = `${formatNumber(Rtotal)} Ω`
    return {
      skill: 'Series/Parallel',
      prompt: 'Find the equivalent resistance (series-parallel)',
      expression: `R₁ = ${R1} Ω, R₂ = ${R2} Ω (parallel), R₃ = ${R3} Ω (series)`,
      mathLatex: String.raw`R_1 = ${R1}\,\Omega,\; R_2 = ${R2}\,\Omega\text{ (parallel)},\; R_3 = ${R3}\,\Omega\text{ (series)}`,
      answer,
      options: shuffledOptions(answer, [`${formatNumber(Rtotal + 1)} Ω`, `${formatNumber(Rtotal + 2)} Ω`, `${formatNumber(Math.max(0.1, Rtotal - 1))} Ω`]),
      steps: [
        `First, find parallel equivalent of R₁ and R₂: $R_{\\text{parallel}} = \\frac{${R1} \\times ${R2}}{${R1} + ${R2}} = ${formatNumber(Rparallel)}\\,\\Omega$.`,
        `Then add series R₃: $R_{\\text{eq}} = ${formatNumber(Rparallel)} + ${R3} = ${formatNumber(Rtotal)}\\,\\Omega$.`,
        `The total equivalent resistance is $${answer}$.`,
      ],
    }
  }
}

function driftVelocityProblem(level) {
  const n = (randomInt(5, 10) * 1e28).toExponential(1)
  const A = randomInt(1, 3) * 1e-6
  const I = randomInt(2, 5 + level * 2)
  const e = 1.6e-19
  const v_d = I / (n * A * e)
  const answer = `${formatNumber(v_d)} m/s`
  return {
    skill: 'Drift Velocity',
    prompt: 'Find the drift velocity',
    expression: `n = ${n} m⁻³, A = ${A * 1e6} mm², I = ${I} A`,
    mathLatex: String.raw`n = ${n}\,\mathrm{m}^{-3},\; A = ${A * 1e6}\,\mathrm{mm}^2,\; I = ${I}\,\mathrm{A}`,
    answer,
    options: shuffledOptions(answer, [
      `${formatNumber(v_d * 2)} m/s`,
      `${formatNumber(v_d * 10)} m/s`,
      `${formatNumber(v_d / 2)} m/s`,
    ]),
    steps: [
      `Use the formula: $v_d = \\frac{I}{n A e}$.`,
      `Substitute: $v_d = \\frac{${I}}{${n} \\times ${A} \\times 1.6 \\times 10^{-19}}$.`,
      `The drift velocity is $${answer}$.`,
    ],
  }
}

function carrierConcentrationProblem(level) {
  const type = randomInt(1, 3)
  if (type === 1) {
    const Nd = randomInt(1, 5) * Math.pow(10, randomInt(14, 17))
    const ni = 1.5e10
    const n = Nd
    const p = (ni * ni) / Nd
    const answer = `n = ${n.toExponential(1)} cm⁻³, p = ${p.toExponential(1)} cm⁻³`
    return {
      skill: 'Carrier Concentration',
      prompt: 'Find carrier concentrations (n-type)',
      expression: `N_d = ${Nd.toExponential(1)} cm⁻³, n_i = 1.5×10¹⁰ cm⁻³`,
      mathLatex: String.raw`N_d = ${Nd.toExponential(1)}\,\mathrm{cm}^{-3},\; n_i = 1.5\times10^{10}\,\mathrm{cm}^{-3}`,
      answer,
      options: shuffledOptions(answer, [
        `n = ${(Nd/2).toExponential(1)} cm⁻³, p = ${((ni*ni)/(Nd/2)).toExponential(1)} cm⁻³`,
        `n = ${(Nd*2).toExponential(1)} cm⁻³, p = ${((ni*ni)/(Nd*2)).toExponential(1)} cm⁻³`,
        `n = ${ni.toExponential(1)} cm⁻³, p = ${ni.toExponential(1)} cm⁻³`,
      ]),
      steps: [
        `For n-type: $n \\approx N_d = ${Nd.toExponential(1)}\,\mathrm{cm}^{-3}$.`,
        `Use mass action law: $p = n_i^2 / n = (1.5\\times10^{10})^2 / ${Nd.toExponential(1)}$.`,
        `Hole concentration: $p = ${p.toExponential(1)}\,\mathrm{cm}^{-3}$.`,
      ],
    }
  } else if (type === 2) {
    const Na = randomInt(1, 5) * Math.pow(10, randomInt(14, 17))
    const ni = 1.5e10
    const p = Na
    const n = (ni * ni) / Na
    const answer = `p = ${p.toExponential(1)} cm⁻³, n = ${n.toExponential(1)} cm⁻³`
    return {
      skill: 'Carrier Concentration',
      prompt: 'Find carrier concentrations (p-type)',
      expression: `N_a = ${Na.toExponential(1)} cm⁻³, n_i = 1.5×10¹⁰ cm⁻³`,
      mathLatex: String.raw`N_a = ${Na.toExponential(1)}\,\mathrm{cm}^{-3},\; n_i = 1.5\times10^{10}\,\mathrm{cm}^{-3}`,
      answer,
      options: shuffledOptions(answer, [
        `p = ${(Na/2).toExponential(1)} cm⁻³, n = ${((ni*ni)/(Na/2)).toExponential(1)} cm⁻³`,
        `p = ${(Na*2).toExponential(1)} cm⁻³, n = ${((ni*ni)/(Na*2)).toExponential(1)} cm⁻³`,
        `n = ${ni.toExponential(1)} cm⁻³, p = ${ni.toExponential(1)} cm⁻³`,
      ]),
      steps: [
        `For p-type: $p \\approx N_a = ${Na.toExponential(1)}\,\mathrm{cm}^{-3}$.`,
        `Use mass action law: $n = n_i^2 / p = (1.5\\times10^{10})^2 / ${Na.toExponential(1)}$.`,
        `Electron concentration: $n = ${n.toExponential(1)}\,\mathrm{cm}^{-3}$.`,
      ],
    }
  } else {
    const n = randomInt(1, 5) * Math.pow(10, randomInt(14, 17))
    const p = randomInt(1, 5) * Math.pow(10, randomInt(14, 17))
    const ni = Math.sqrt(n * p)
    const answer = `n_i = ${ni.toExponential(1)} cm⁻³`
    return {
      skill: 'Carrier Concentration',
      prompt: 'Find intrinsic carrier concentration',
      expression: `n = ${n.toExponential(1)} cm⁻³, p = ${p.toExponential(1)} cm⁻³`,
      mathLatex: String.raw`n = ${n.toExponential(1)}\,\mathrm{cm}^{-3},\; p = ${p.toExponential(1)}\,\mathrm{cm}^{-3}`,
      answer,
      options: shuffledOptions(answer, [
        `n_i = ${(ni*2).toExponential(1)} cm⁻³`,
        `n_i = ${(ni/2).toExponential(1)} cm⁻³`,
        `n_i = 1.5×10¹⁰ cm⁻³`,
      ]),
      steps: [
        `Use mass action law: $n_i = \\sqrt{n p}$.`,
        `Substitute: $n_i = \\sqrt{${n.toExponential(1)} \\times ${p.toExponential(1)}}$.`,
        `The intrinsic concentration is $${answer}$.`,
      ],
    }
  }
}

function diodeEquationProblem(level) {
  const I0 = Math.pow(10, -randomInt(12, 15))
  const V = 0.6 + randomInt(0, 2) * 0.1
  const n = 1 + randomInt(0, 1) * 0.5
  const kTq = 0.0259
  const exponent = V / (n * kTq)
  const expVal = Math.exp(exponent)
  const I = I0 * (expVal - 1)
  const answer = `${I.toExponential(2)} A`
  return {
    skill: 'Diode Equation',
    prompt: 'Find the diode forward current',
    expression: `I₀ = ${I0.toExponential(1)} A, V = ${V} V, n = ${n}`,
    mathLatex: String.raw`I_0 = ${I0.toExponential(1)}\,\mathrm{A},\; V = ${V}\,\mathrm{V},\; n = ${n}`,
    answer,
    options: shuffledOptions(answer, [
      `${(I * 2).toExponential(2)} A`,
      `${(I / 2).toExponential(2)} A`,
      `${(I * 10).toExponential(2)} A`,
    ]),
    steps: [
      `Use the Shockley diode equation: $I = I_0 [e^{qV/nkT} - 1]$.`,
      `At 300 K, $kT/q \\approx 0.0259\\,\\mathrm{V}$.`,
      `Exponent: $qV/nkT = ${V} / (${n} \\times 0.0259) \\approx ${exponent.toFixed(1)}$.`,
      `Current: $I = ${I0.toExponential(1)} (e^{${exponent.toFixed(1)}} - 1) \\approx ${answer}$.`,
    ],
  }
}

function bjtGainsProblem(level) {
  const type = randomInt(1, 3)
  if (type === 1) {
    const beta = randomInt(50, 200 + level * 50)
    const IB = randomInt(10, 50 + level * 20)
    const IC = beta * IB
    const answer = `${IC} μA`
    return {
      skill: 'BJT Gains',
      prompt: 'Find the collector current',
      expression: `β = ${beta}, I_B = ${IB} μA`,
      mathLatex: String.raw`\\beta = ${beta},\; I_B = ${IB}\,\mu\mathrm{A}`,
      answer,
      options: shuffledOptions(answer, [`${IC + randomInt(10, 50)} μA`, `${IC + randomInt(51, 100)} μA`, `${Math.max(1, IC - randomInt(10, 50))} μA`]),
      steps: [
        `Use the current gain formula: $I_C = \\beta I_B$.`,
        `Substitute: $I_C = ${beta} \\times ${IB}$.`,
        `The collector current is $${answer}$.`,
      ],
    }
  } else if (type === 2) {
    const IC = randomInt(100, 1000 + level * 500)
    const IB = randomInt(5, 50 + level * 10)
    const beta = IC / IB
    const answer = `${formatNumber(beta)}`
    return {
      skill: 'BJT Gains',
      prompt: 'Find the current gain β',
      expression: `I_C = ${IC} μA, I_B = ${IB} μA`,
      mathLatex: String.raw`I_C = ${IC}\,\mu\mathrm{A},\; I_B = ${IB}\,\mu\mathrm{A}`,
      answer,
      options: shuffledOptions(answer, [`${formatNumber(beta + 10)}`, `${formatNumber(beta + 20)}`, `${formatNumber(Math.max(1, beta - 10))}`]),
      steps: [
        `Use the definition: $\\beta = I_C / I_B$.`,
        `Substitute: $\\beta = ${IC} / ${IB}$.`,
        `The current gain is $\\beta = ${answer}$.`,
      ],
    }
  } else {
    const alpha = 0.95 + randomInt(0, 4) * 0.01
    const beta = alpha / (1 - alpha)
    const answer = `${formatNumber(beta)}`
    return {
      skill: 'BJT Gains',
      prompt: 'Find β from α',
      expression: `α = ${alpha}`,
      mathLatex: String.raw`\\alpha = ${alpha}`,
      answer,
      options: shuffledOptions(answer, [`${formatNumber(beta + 5)}`, `${formatNumber(beta + 10)}`, `${formatNumber(Math.max(1, beta - 5))}`]),
      steps: [
        'Use the relation: $\\beta = \\alpha / (1 - \\alpha)$.',
        `Substitute: $\\beta = ${alpha} / (1 - ${alpha})$.`,
        `Calculate: $\\beta = ${alpha} / ${(1 - alpha).toFixed(4)} = ${answer}$.`,
      ],
    }
  }
}

function jfetMosfetProblem(level) {
  const type = randomInt(1, 2)
  if (type === 1) {
    const IDSS = randomInt(4, 12 + level * 4)
    const VP = -(randomInt(2, 6 + level * 2))
    const VGS = randomInt(1, Math.abs(VP) - 1) * (VP < 0 ? -1 : 1)
    const ID = IDSS * Math.pow(1 - VGS / VP, 2)
    const answer = `${formatNumber(ID)} mA`
    return {
      skill: 'JFET/MOSFET',
      prompt: 'Find the JFET drain current',
      expression: `I_DSS = ${IDSS} mA, V_P = ${VP} V, V_GS = ${VGS} V`,
      mathLatex: String.raw`I_{DSS} = ${IDSS}\,\mathrm{mA},\; V_P = ${VP}\,\mathrm{V},\; V_{GS} = ${VGS}\,\mathrm{V}`,
      answer,
      options: shuffledOptions(answer, [`${formatNumber(ID + 1)} mA`, `${formatNumber(ID + 2)} mA`, `${formatNumber(Math.max(0.1, ID - 1))} mA`]),
      steps: [
        `Use the JFET Shockley equation: $I_D = I_{DSS} (1 - V_{GS}/V_P)^2$.`,
        `Substitute: $I_D = ${IDSS} (1 - ${VGS}/${VP})^2$.`,
        `Calculate: $I_D = ${IDSS} \\times ${(1 - VGS/VP).toFixed(3)}^2 = ${answer}$.`,
      ],
    }
  } else {
    const k = randomInt(1, 5) * 0.1
    const Vth = 1 + randomInt(0, 3)
    const VGS = Vth + randomInt(1, 4)
    const ID = k * Math.pow(VGS - Vth, 2)
    const answer = `${formatNumber(ID)} mA`
    return {
      skill: 'JFET/MOSFET',
      prompt: 'Find the MOSFET drain current (saturation)',
      expression: `k = ${k} mA/V², V_th = ${Vth} V, V_GS = ${VGS} V`,
      mathLatex: String.raw`k = ${k}\,\mathrm{mA/V}^2,\; V_{th} = ${Vth}\,\mathrm{V},\; V_{GS} = ${VGS}\,\mathrm{V}`,
      answer,
      options: shuffledOptions(answer, [`${formatNumber(ID + 0.5)} mA`, `${formatNumber(ID + 1)} mA`, `${formatNumber(Math.max(0.1, ID - 0.5))} mA`]),
      steps: [
        `Use the MOSFET square law: $I_D = k (V_{GS} - V_{th})^2$.`,
        `Substitute: $I_D = ${k} (${VGS} - ${Vth})^2$.`,
        `Calculate: $I_D = ${k} \\times ${VGS - Vth}^2 = ${answer}$.`,
      ],
    }
  }
}

export function createProblem(skill, level = 1) {
  switch (skill) {
    case "Ohm's Law":
      return ohmsLawProblem(level)
    case 'Power':
      return powerProblem(level)
    case 'Series/Parallel':
      return seriesParallelProblem(level)
    case 'Drift Velocity':
      return driftVelocityProblem(level)
    case 'Carrier Concentration':
      return carrierConcentrationProblem(level)
    case 'Diode Equation':
      return diodeEquationProblem(level)
    case 'BJT Gains':
      return bjtGainsProblem(level)
    case 'JFET/MOSFET':
      return jfetMosfetProblem(level)
    default:
      return ohmsLawProblem(level)
  }
}

export function createAppliedProblem(field, level = 1) {
  if (field === 'Circuit Analysis') {
    const type = randomInt(1, 3)
    if (type === 1) {
      const V = randomInt(10, 24 + level * 6)
      const R1 = randomInt(5, 15 + level * 5)
      const R2 = randomInt(5, 15 + level * 5)
      const R3 = randomInt(5, 15 + level * 5)
      const Rtotal = R1 + R2 + R3
      const I = V / Rtotal
      const answer = `${formatNumber(I)} A`
      return {
        skill: 'Applied Physics',
        field,
        prompt: 'A battery drives current through three series resistors. Find the circuit current.',
        expression: `V = ${V} V, R₁ = ${R1} Ω, R₂ = ${R2} Ω, R₃ = ${R3} Ω`,
        mathLatex: String.raw`V = ${V}\,\mathrm{V},\; R_1 = ${R1}\,\Omega,\; R_2 = ${R2}\,\Omega,\; R_3 = ${R3}\,\Omega`,
        answer,
        options: shuffledOptions(answer, [`${formatNumber(I + 0.2)} A`, `${formatNumber(I + 0.5)} A`, `${formatNumber(Math.max(0.1, I - 0.2))} A`]),
        steps: [
          `Total series resistance: $R_{\\text{eq}} = ${R1} + ${R2} + ${R3} = ${Rtotal}\,\Omega$.`,
          `Apply Ohm's Law: $I = V / R_{\\text{eq}} = ${V} / ${Rtotal}$.`,
          `The circuit current is $${answer}$.`,
        ],
      }
    } else if (type === 2) {
      const V = randomInt(10, 24 + level * 4)
      const R1 = randomInt(5, 20 + level * 5)
      const R2 = randomInt(5, 20 + level * 5)
      const Rparallel = (R1 * R2) / (R1 + R2)
      const I = V / Rparallel
      const answer = `${formatNumber(I)} A`
      return {
        skill: 'Applied Physics',
        field,
        prompt: 'A battery is connected across two parallel resistors. Find the total current from the battery.',
        expression: `V = ${V} V, R₁ = ${R1} Ω, R₂ = ${R2} Ω`,
        mathLatex: String.raw`V = ${V}\,\mathrm{V},\; R_1 = ${R1}\,\Omega,\; R_2 = ${R2}\,\Omega`,
        answer,
        options: shuffledOptions(answer, [`${formatNumber(I + 0.2)} A`, `${formatNumber(I + 0.5)} A`, `${formatNumber(Math.max(0.1, I - 0.2))} A`]),
        steps: [
          `Parallel equivalent: $R_{\\text{eq}} = \\frac{${R1} \\times ${R2}}{${R1} + ${R2}} = ${formatNumber(Rparallel)}\,\Omega$.`,
          `Total current: $I = V / R_{\\text{eq}} = ${V} / ${formatNumber(Rparallel)}$.`,
          `The battery supplies $${answer}$.`,
        ],
      }
    } else {
      const V = randomInt(10, 24 + level * 4)
      const R1 = randomInt(5, 15 + level * 5)
      const R2 = randomInt(5, 15 + level * 5)
      const R3 = randomInt(5, 15 + level * 5)
      const R23 = (R2 * R3) / (R2 + R3)
      const Rtotal = R1 + R23
      const I = V / Rtotal
      const answer = `${formatNumber(I)} A`
      return {
        skill: 'Applied Physics',
        field,
        prompt: 'A series-parallel circuit with a battery. Find the total current.',
        expression: `V = ${V} V, R₁ = ${R1} Ω (series), R₂ = ${R2} Ω, R₃ = ${R3} Ω (parallel)`,
        mathLatex: String.raw`V = ${V}\,\mathrm{V},\; R_1 = ${R1}\,\Omega\text{ (series)},\; R_2 = ${R2}\,\Omega,\; R_3 = ${R3}\,\Omega\text{ (parallel)}`,
        answer,
        options: shuffledOptions(answer, [`${formatNumber(I + 0.2)} A`, `${formatNumber(I + 0.5)} A`, `${formatNumber(Math.max(0.1, I - 0.2))} A`]),
        steps: [
          `Parallel part: $R_{23} = \\frac{${R2} \\times ${R3}}{${R2} + ${R3}} = ${formatNumber(R23)}\,\Omega$.`,
          `Total: $R_{\\text{eq}} = ${R1} + ${formatNumber(R23)} = ${formatNumber(Rtotal)}\,\Omega$.`,
          `Current: $I = ${V} / ${formatNumber(Rtotal)} = ${answer}$.`,
        ],
      }
    }
  }

  if (field === 'Semiconductor Devices') {
    const type = randomInt(1, 3)
    if (type === 1) {
      const Nd = randomInt(1, 5) * Math.pow(10, randomInt(15, 17))
      const ni = 1.5e10
      const n = Nd
      const p = (ni * ni) / Nd
      const answer = `n = ${n.toExponential(1)} cm⁻³, p = ${p.toExponential(1)} cm⁻³`
      return {
        skill: 'Applied Physics',
        field,
        prompt: 'An n-type silicon sample has a known donor concentration. Find the electron and hole concentrations at 300 K.',
        expression: `N_d = ${Nd.toExponential(1)} cm⁻³, n_i = 1.5×10¹⁰ cm⁻³`,
        mathLatex: String.raw`N_d = ${Nd.toExponential(1)}\,\mathrm{cm}^{-3},\; n_i = 1.5\times10^{10}\,\mathrm{cm}^{-3}`,
        answer,
        options: shuffledOptions(answer, [
          `n = ${(Nd/2).toExponential(1)} cm⁻³, p = ${((ni*ni)/(Nd/2)).toExponential(1)} cm⁻³`,
          `n = ${(Nd*2).toExponential(1)} cm⁻³, p = ${((ni*ni)/(Nd*2)).toExponential(1)} cm⁻³`,
          `n = ${ni.toExponential(1)} cm⁻³, p = ${ni.toExponential(1)} cm⁻³`,
        ]),
        steps: [
          `For n-type at room temperature: $n \\approx N_d = ${Nd.toExponential(1)}\,\mathrm{cm}^{-3}$.`,
          `Mass action law: $p = n_i^2 / n = (1.5\\times10^{10})^2 / ${Nd.toExponential(1)}$.`,
          `Hole concentration: $p = ${p.toExponential(1)}\,\mathrm{cm}^{-3}$ (minority carriers).`,
        ],
      }
    } else if (type === 2) {
      const I0 = Math.pow(10, -randomInt(12, 14))
      const V = 0.65 + randomInt(0, 2) * 0.05
      const n = 1
      const kTq = 0.0259
      const exponent = V / (n * kTq)
      const I = I0 * (Math.exp(exponent) - 1)
      const answer = `${I.toExponential(2)} A`
      return {
        skill: 'Applied Physics',
        field,
        prompt: 'A silicon p-n junction diode is forward biased. Find the forward current.',
        expression: `I₀ = ${I0.toExponential(1)} A, V = ${V} V, n = ${n}`,
        mathLatex: String.raw`I_0 = ${I0.toExponential(1)}\,\mathrm{A},\; V = ${V}\,\mathrm{V},\; n = ${n}`,
        answer,
        options: shuffledOptions(answer, [
          `${(I * 2).toExponential(2)} A`,
          `${(I / 2).toExponential(2)} A`,
          `${(I * 10).toExponential(2)} A`,
        ]),
        steps: [
          `Shockley diode equation: $I = I_0 [e^{qV/nkT} - 1]$.`,
          `At 300 K, $kT/q \\approx 0.0259\,\mathrm{V}$.`,
          `Exponent: ${V} / (${n} \\times 0.0259) \\approx ${exponent.toFixed(1)}.`,
          `Forward current: $I \\approx ${answer}$.`,
        ],
      }
    } else {
      const beta = randomInt(80, 150)
      const IB = randomInt(10, 40)
      const IC = beta * IB
      const answer = `${IC} μA`
      return {
        skill: 'Applied Physics',
        field,
        prompt: 'An NPN transistor in common-emitter configuration. Find the collector current.',
        expression: `β = ${beta}, I_B = ${IB} μA`,
        mathLatex: String.raw`\\beta = ${beta},\; I_B = ${IB}\,\mu\mathrm{A}`,
        answer,
        options: shuffledOptions(answer, [`${IC + randomInt(10, 50)} μA`, `${IC + randomInt(51, 100)} μA`, `${Math.max(1, IC - randomInt(10, 50))} μA`]),
        steps: [
          `In active region: $I_C = \\beta I_B$.`,
          `Substitute: $I_C = ${beta} \\times ${IB}$.`,
          `Collector current: $${answer}$.`,
        ],
      }
    }
  }

  const V = randomInt(10, 24 + level * 4)
  const R1 = randomInt(5, 15 + level * 5)
  const R2 = randomInt(5, 15 + level * 5)
  const Rtotal = R1 + R2
  const I = V / Rtotal
  const P = I * I * Rtotal
  const answer = `${formatNumber(P)} W`
  return {
    skill: 'Applied Physics',
    field: 'Electronic Design',
    prompt: 'A series circuit with a battery and two resistors. Find the total power dissipated.',
    expression: `V = ${V} V, R₁ = ${R1} Ω, R₂ = ${R2} Ω`,
    mathLatex: String.raw`V = ${V}\,\mathrm{V},\; R_1 = ${R1}\,\Omega,\; R_2 = ${R2}\,\Omega`,
    answer,
    options: shuffledOptions(answer, [`${formatNumber(P + 1)} W`, `${formatNumber(P + 2)} W`, `${formatNumber(Math.max(0.1, P - 1))} W`]),
    steps: [
      `Total resistance: $R_{\\text{eq}} = ${R1} + ${R2} = ${Rtotal}\,\Omega$.`,
      `Current: $I = V / R_{\\text{eq}} = ${V} / ${Rtotal} = ${formatNumber(I)}\,\mathrm{A}$.`,
      `Power: $P = I^2 R = ${formatNumber(I)}^2 \\times ${Rtotal} = ${answer}$.`,
    ],
  }
}

function formatAppliedNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
}

export function solveMathInput(mode, input) {
  const expression = input.trim().replaceAll('−', '-').replaceAll('×', '*')
  if (!expression) throw new Error('Type a problem first, and we\'ll work through it together.')

  if (mode === "Ohm's Law") {
    const match = expression.match(/V\s*=\s*([+-]?\d+(?:\.\d+)?)\s*,\s*R\s*=\s*([+-]?\d+(?:\.\d+)?)/i)
    if (match) {
      const V = parseFloat(match[1])
      const R = parseFloat(match[2])
      if (R === 0) throw new Error('Resistance cannot be zero.')
      const I = V / R
      const answer = `I = ${formatNumber(I)} A`
      return {
        skill: mode,
        answer,
        steps: [
          `Use Ohm's Law: $I = V / R$.`,
          `Substitute: $I = ${V} / ${R}$.`,
          `The current is $${answer}$.`,
        ],
      }
    }
    const match2 = expression.match(/I\s*=\s*([+-]?\d+(?:\.\d+)?)\s*,\s*R\s*=\s*([+-]?\d+(?:\.\d+)?)/i)
    if (match2) {
      const I = parseFloat(match2[1])
      const R = parseFloat(match2[2])
      const V = I * R
      const answer = `V = ${V} V`
      return {
        skill: mode,
        answer,
        steps: [
          `Use Ohm's Law: $V = I \\times R$.`,
          `Substitute: $V = ${I} \\times ${R}$.`,
          `The voltage is $${answer}$.`,
        ],
      }
    }
    const match3 = expression.match(/V\s*=\s*([+-]?\d+(?:\.\d+)?)\s*,\s*I\s*=\s*([+-]?\d+(?:\.\d+)?)/i)
    if (match3) {
      const V = parseFloat(match3[1])
      const I = parseFloat(match3[2])
      if (I === 0) throw new Error('Current cannot be zero.')
      const R = V / I
      const answer = `R = ${formatNumber(R)} Ω`
      return {
        skill: mode,
        answer,
        steps: [
          `Use Ohm's Law: $R = V / I$.`,
          `Substitute: $R = ${V} / ${I}$.`,
          `The resistance is $${answer}$.`,
        ],
      }
    }
    throw new Error('Try a format like "V = 12, R = 6" or "I = 2, R = 6" or "V = 12, I = 2"')
  }

  if (mode === 'Power') {
    const match = expression.match(/V\s*=\s*([+-]?\d+(?:\.\d+)?)\s*,\s*I\s*=\s*([+-]?\d+(?:\.\d+)?)/i)
    if (match) {
      const V = parseFloat(match[1])
      const I = parseFloat(match[2])
      const P = V * I
      const answer = `P = ${P} W`
      return {
        skill: mode,
        answer,
        steps: [
          `Use the power formula: $P = V \\times I$.`,
          `Substitute: $P = ${V} \\times ${I}$.`,
          `The power is $${answer}$.`,
        ],
      }
    }
    const match2 = expression.match(/I\s*=\s*([+-]?\d+(?:\.\d+)?)\s*,\s*R\s*=\s*([+-]?\d+(?:\.\d+)?)/i)
    if (match2) {
      const I = parseFloat(match2[1])
      const R = parseFloat(match2[2])
      const P = I * I * R
      const answer = `P = ${P} W`
      return {
        skill: mode,
        answer,
        steps: [
          `Use the power formula: $P = I^2 R$.`,
          `Substitute: $P = ${I}^2 \\times ${R}$.`,
          `The power is $${answer}$.`,
        ],
      }
    }
    const match3 = expression.match(/V\s*=\s*([+-]?\d+(?:\.\d+)?)\s*,\s*R\s*=\s*([+-]?\d+(?:\.\d+)?)/i)
    if (match3) {
      const V = parseFloat(match3[1])
      const R = parseFloat(match3[2])
      const P = (V * V) / R
      const answer = `P = ${formatNumber(P)} W`
      return {
        skill: mode,
        answer,
        steps: [
          `Use the power formula: $P = V^2 / R$.`,
          `Substitute: $P = ${V}^2 / ${R}$.`,
          `The power is $${answer}$.`,
        ],
      }
    }
    throw new Error('Try a format like "V = 12, I = 2" or "I = 2, R = 6" or "V = 12, R = 6"')
  }

  if (mode === 'Series/Parallel') {
    const match = expression.match(/R[₁1]\s*=\s*([+-]?\d+(?:\.\d+)?)\s*,\s*R[₂2]\s*=\s*([+-]?\d+(?:\.\d+)?)(?:\s*,\s*R[₃3]\s*=\s*([+-]?\d+(?:\.\d+)?))?/i)
    if (match) {
      const R1 = parseFloat(match[1])
      const R2 = parseFloat(match[2])
      if (match[3]) {
        const R3 = parseFloat(match[3])
        const Rtotal = R1 + R2 + R3
        const answer = `R_eq = ${Rtotal} Ω (series)`
        return {
          skill: mode,
          answer,
          steps: [
            `For series resistors: $R_{\\text{eq}} = R_1 + R_2 + R_3$.`,
            `Add them: $${R1} + ${R2} + ${R3} = ${Rtotal}$.`,
            `The equivalent resistance is $${answer}$.`,
          ],
        }
      } else {
        const Rtotal = (R1 * R2) / (R1 + R2)
        const answer = `R_eq = ${formatNumber(Rtotal)} Ω (parallel)`
        return {
          skill: mode,
          answer,
          steps: [
            `For two parallel resistors: $R_{\\text{eq}} = \\frac{R_1 R_2}{R_1 + R_2}$.`,
            `Substitute: $R_{\\text{eq}} = \\frac{${R1} \\times ${R2}}{${R1} + ${R2}}$.`,
            `The equivalent resistance is $${answer}$.`,
          ],
        }
      }
    }
    throw new Error('Try a format like "R1 = 10, R2 = 20" or "R1 = 10, R2 = 20, R3 = 30"')
  }

  if (mode === 'Drift Velocity') {
    const match = expression.match(/n\s*=\s*([\d.]+(?:e[+-]?\d+)?)\s*,\s*A\s*=\s*([\d.]+(?:e[+-]?\d+)?)\s*,\s*I\s*=\s*([\d.]+(?:e[+-]?\d+)?)/i)
    if (match) {
      const n = parseFloat(match[1])
      const A = parseFloat(match[2])
      const I = parseFloat(match[3])
      const e = 1.6e-19
      const v_d = I / (n * A * e)
      const answer = `v_d = ${formatNumber(v_d)} m/s`
      return {
        skill: mode,
        answer,
        steps: [
          `Use the formula: $v_d = \\frac{I}{n A e}$.`,
          `Substitute: $v_d = \\frac{${I}}{${n} \\times ${A} \\times 1.6 \\times 10^{-19}}$.`,
          `The drift velocity is $${answer}$.`,
        ],
      }
    }
    throw new Error('Try a format like "n = 8.5e28, A = 1e-6, I = 5"')
  }

  if (mode === 'Carrier Concentration') {
    const match = expression.match(/N[da]\s*=\s*([\d.]+(?:e[+-]?\d+)?)\s*,\s*n[ia]\s*=\s*([\d.]+(?:e[+-]?\d+)?)/i)
    if (match) {
      const Nd = parseFloat(match[1])
      const ni = parseFloat(match[2])
      const isNtype = expression.toLowerCase().includes('n_d') || expression.toLowerCase().includes('nd')
      if (isNtype) {
        const n = Nd
        const p = (ni * ni) / Nd
        const answer = `n = ${n.toExponential(1)} cm⁻³, p = ${p.toExponential(1)} cm⁻³`
        return {
          skill: mode,
          answer,
          steps: [
            `For n-type: $n \\approx N_d = ${Nd.toExponential(1)}\,\mathrm{cm}^{-3}$.`,
            `Mass action law: $p = n_i^2 / n = ${ni.toExponential(1)}^2 / ${Nd.toExponential(1)}$.`,
            `Hole concentration: $p = ${p.toExponential(1)}\,\mathrm{cm}^{-3}$.`,
          ],
        }
      } else {
        const p = Nd
        const n = (ni * ni) / Nd
        const answer = `p = ${p.toExponential(1)} cm⁻³, n = ${n.toExponential(1)} cm⁻³`
        return {
          skill: mode,
          answer,
          steps: [
            `For p-type: $p \\approx N_a = ${Nd.toExponential(1)}\,\mathrm{cm}^{-3}$.`,
            `Mass action law: $n = n_i^2 / p = ${ni.toExponential(1)}^2 / ${Nd.toExponential(1)}$.`,
            `Electron concentration: $n = ${n.toExponential(1)}\,\mathrm{cm}^{-3}$.`,
          ],
        }
      }
    }
    throw new Error('Try a format like "Nd = 1e16, ni = 1.5e10" or "Na = 1e16, ni = 1.5e10"')
  }

  if (mode === 'Diode Equation') {
    const match = expression.match(/I[₀0]\s*=\s*([\d.]+(?:e[+-]?\d+)?)\s*,\s*V\s*=\s*([\d.]+(?:e[+-]?\d+)?)\s*(?:,\s*n\s*=\s*([\d.]+(?:e[+-]?\d+)?))?/i)
    if (match) {
      const I0 = parseFloat(match[1])
      const V = parseFloat(match[2])
      const n = match[3] ? parseFloat(match[3]) : 1
      const kTq = 0.0259
      const exponent = V / (n * kTq)
      const I = I0 * (Math.exp(exponent) - 1)
      const answer = `I = ${I.toExponential(2)} A`
      return {
        skill: mode,
        answer,
        steps: [
          `Use Shockley equation: $I = I_0 [e^{qV/nkT} - 1]$.`,
          `At 300 K, $kT/q \\approx 0.0259\,\mathrm{V}$.`,
          `Exponent: $qV/nkT = ${V} / (${n} \\times 0.0259) \\approx ${exponent.toFixed(1)}$.`,
          `Current: $I = ${I0.toExponential(1)} (e^{${exponent.toFixed(1)}} - 1) \\approx ${answer}$.`,
        ],
      }
    }
    throw new Error('Try a format like "I0 = 1e-12, V = 0.7, n = 1"')
  }

  if (mode === 'BJT Gains') {
    const match = expression.match(/(?:β|beta)\s*=\s*([\d.]+(?:e[+-]?\d+)?)\s*,\s*I[Bb]\s*=\s*([\d.]+(?:e[+-]?\d+)?)/i)
    if (match) {
      const beta = parseFloat(match[1])
      const IB = parseFloat(match[2])
      const IC = beta * IB
      const answer = `I_C = ${IC} μA`
      return {
        skill: mode,
        answer,
        steps: [
          `Use the current gain formula: $I_C = \\beta I_B$.`,
          `Substitute: $I_C = ${beta} \\times ${IB}$.`,
          `The collector current is $${answer}$.`,
        ],
      }
    }
    const match2 = expression.match(/I[Cc]\s*=\s*([\d.]+(?:e[+-]?\d+)?)\s*,\s*I[Bb]\s*=\s*([\d.]+(?:e[+-]?\d+)?)/i)
    if (match2) {
      const IC = parseFloat(match2[1])
      const IB = parseFloat(match2[2])
      const beta = IC / IB
      const answer = `β = ${formatNumber(beta)}`
      return {
        skill: mode,
        answer,
        steps: [
          'Use the definition: $\\beta = I_C / I_B$.',
          `Substitute: $\\beta = ${IC} / ${IB}$.`,
          `The current gain is $\\beta = ${answer}$.`,
        ],
      }
    }
    const match3 = expression.match(/(?:α|alpha)\s*=\s*([\d.]+(?:e[+-]?\d+)?)/i)
    if (match3) {
      const alpha = parseFloat(match3[1])
      const beta = alpha / (1 - alpha)
      const answer = `β = ${formatNumber(beta)}`
      return {
        skill: mode,
        answer,
        steps: [
          'Use the relation: $\\beta = \\alpha / (1 - \\alpha)$.',
          `Substitute: $\\beta = ${alpha} / (1 - ${alpha})$.`,
          `Calculate: $\\beta = ${alpha} / ${(1 - alpha).toFixed(4)} = ${answer}$.`,
        ],
      }
    }
    throw new Error('Try a format like "β = 100, IB = 20" or "IC = 2000, IB = 20" or "alpha = 0.99"')
  }

  if (mode === 'JFET/MOSFET') {
    const match = expression.match(/I[Dd]SS\s*=\s*([\d.]+(?:e[+-]?\d+)?)\s*,\s*V[Pp]\s*=\s*([+-]?[\d.]+(?:e[+-]?\d+)?)\s*,\s*V[Gg][Ss]\s*=\s*([+-]?[\d.]+(?:e[+-]?\d+)?)/i)
    if (match) {
      const IDSS = parseFloat(match[1])
      const VP = parseFloat(match[2])
      const VGS = parseFloat(match[3])
      const ID = IDSS * Math.pow(1 - VGS / VP, 2)
      const answer = `I_D = ${formatNumber(ID)} mA`
      return {
        skill: mode,
        answer,
        steps: [
          `Use JFET equation: $I_D = I_{DSS} (1 - V_{GS}/V_P)^2$.`,
          `Substitute: $I_D = ${IDSS} (1 - ${VGS}/${VP})^2$.`,
          `Calculate: $I_D = ${IDSS} \\times ${(1 - VGS/VP).toFixed(3)}^2 = ${answer}$.`,
        ],
      }
    }
    const match2 = expression.match(/k\s*=\s*([\d.]+(?:e[+-]?\d+)?)\s*,\s*V[_\s]?th\s*=\s*([\d.]+(?:e[+-]?\d+)?)\s*,\s*V[Gg][Ss]\s*=\s*([\d.]+(?:e[+-]?\d+)?)/i)
    if (match2) {
      const k = parseFloat(match2[1])
      const Vth = parseFloat(match2[2])
      const VGS = parseFloat(match2[3])
      const ID = k * Math.pow(VGS - Vth, 2)
      const answer = `I_D = ${formatNumber(ID)} mA`
      return {
        skill: mode,
        answer,
        steps: [
          `Use MOSFET square law: $I_D = k (V_{GS} - V_{th})^2$.`,
          `Substitute: $I_D = ${k} (${VGS} - ${Vth})^2$.`,
          `Calculate: $I_D = ${k} \\times ${VGS - Vth}^2 = ${answer}$.`,
        ],
      }
    }
    throw new Error('Try a format like "IDSS = 8, VP = -4, VGS = -1" or "k = 0.5, Vth = 2, VGS = 4"')
  }

  throw new Error('Choose a physics topic to get started.')
}

function formatNumber(value) {
  if (value !== 0 && Math.abs(value) < 0.001) return value.toExponential(2)
  const rounded = Math.round(value * 10000) / 10000
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}