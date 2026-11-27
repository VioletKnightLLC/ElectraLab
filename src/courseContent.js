export const COURSE_CHAPTERS = [
  {
    id: 'functions-models',
    unit: '01 · Foundations',
    title: 'Functions are models',
    subtitle: 'Connect a changing input to a measurable output.',
    minutes: 7,
    summary: 'Read equations as compact descriptions of physical and computational systems.',
    objectives: ['Identify independent and dependent variables', 'Track units through an equation', 'Recognize when a model is useful'],
    sections: [
      {
        heading: 'A function describes a relationship',
        paragraphs: [
          'A function takes an input and assigns it exactly one output. In an engineering model, time is often the input and position, temperature, or voltage is the output.',
          'The notation $s(t)$ means “position as a function of time.” Changing $t$ changes the value of $s$. Units help keep the relationship grounded: if $t$ is measured in seconds, $s(t)$ might be measured in metres.',
        ],
      },
      {
        heading: 'Models encode assumptions',
        paragraphs: [
          'A useful model leaves out details that do not matter for the current question. The constant-acceleration model assumes acceleration stays fixed over the time interval you care about.',
        ],
        formula: String.raw`s(t)=s_0+v_0t+\frac{1}{2}at^2`,
        note: 'Dimensional check: every term on the right must have units of length.',
      },
    ],
    example: {
      title: 'Read a position model',
      setup: 'A robot starts at 2 m, moves at 3 m/s, and accelerates at 1 m/s². Write its position after $t$ seconds.',
      steps: [
        'Start with the model $s(t)=s_0+v_0t+\\frac{1}{2}at^2$.',
        'Substitute $s_0=2$, $v_0=3$, and $a=1$.',
        'The model is $s(t)=2+3t+\\frac{1}{2}t^2$ metres.',
      ],
    },
    check: {
      question: 'In the model $s(t)$, what does $t$ usually represent?',
      options: ['Elapsed time', 'Position', 'Acceleration', 'A constant unit'],
      answer: 'Elapsed time',
      explanation: 'Here, $t$ is the input variable representing elapsed time; $s(t)$ is the position output.',
    },
    practice: { kind: 'skill', value: 'Algebra', label: 'Practice with algebra' },
  },
  {
    id: 'limits-continuity',
    unit: '01 · Foundations',
    title: 'Limits and continuity',
    subtitle: 'Describe what a system approaches, not just what it does at one instant.',
    minutes: 8,
    summary: 'Use limits to reason about smooth signals and boundary behavior.',
    objectives: ['Interpret a limit as a nearby trend', 'Check continuity at a point', 'Relate a model limit to a system state'],
    sections: [
      {
        heading: 'The nearby behavior matters',
        paragraphs: [
          'A limit asks what value a function approaches as its input gets close to a chosen point. The function does not have to be defined at that point for its limit to exist.',
          'A function is continuous at a point when its value matches the limit there. Continuous models are useful for signals that change without an instantaneous jump.',
        ],
        formula: String.raw`\lim_{t\to 0}V(t)=V(0)`,
      },
      {
        heading: 'A charging capacitor',
        paragraphs: [
          'An ideal RC charging model starts at zero volts and approaches the supply voltage over time. The time constant $\\tau=RC$ controls how quickly the curve rises.',
        ],
        formula: String.raw`V(t)=V_s\left(1-e^{-t/\tau}\right)`,
        note: 'At $t=0$, the exponential is $e^0=1$, so the capacitor begins at $V(0)=0$.',
      },
    ],
    example: {
      title: 'Check the starting value',
      setup: 'For $V(t)=10(1-e^{-t/7})\\,\\mathrm{V}$, find the voltage at $t=0$.',
      steps: [
        'Substitute $t=0$: $V(0)=10(1-e^0)$.',
        'Since $e^0=1$, this becomes $V(0)=10(1-1)$.',
        'The initial voltage is $0\\,\\mathrm{V}$, matching the physical starting state.',
      ],
    },
    check: {
      question: 'What is the initial voltage for the charging model in this lesson?',
      options: ['0 V', '5 V', '10 V', 'It is undefined'],
      answer: '0 V',
      explanation: 'At $t=0$, $e^0=1$, so the factor $1-e^0$ is zero.',
    },
    practice: { kind: 'applied', value: 'Electronics', label: 'Explore an RC circuit' },
  },
  {
    id: 'derivatives-rates',
    unit: '02 · Differentiation',
    title: 'Derivatives measure change',
    subtitle: 'Turn a curve into an instantaneous rate.',
    minutes: 9,
    summary: 'Connect slope, velocity, and voltage change to the derivative.',
    objectives: ['Distinguish average rate from instantaneous rate', 'Use the power rule', 'Interpret the sign and units of a derivative'],
    sections: [
      {
        heading: 'From average slope to tangent slope',
        paragraphs: [
          'The average rate of change over an interval is the change in output divided by the change in input. A derivative is the limiting value of that average rate as the interval shrinks toward zero.',
          'For position s(t), the derivative s′(t) is velocity. Differentiate once more and s″(t) is acceleration. Each derivative also changes the units: metres become metres per second, then metres per second squared.',
        ],
        formula: String.raw`v(t)=\frac{ds}{dt},\qquad a(t)=\frac{d^2s}{dt^2}`,
      },
      {
        heading: 'The power rule',
        paragraphs: [
          'For a power of x, multiply by the exponent and reduce that exponent by one. This gives a repeatable way to find the slope of polynomial models.',
        ],
        formula: String.raw`\frac{d}{dx}x^n=nx^{n-1}`,
      },
    ],
    example: {
      title: 'Find velocity at two seconds',
      setup: 'A moving platform has position $s(t)=2t^2+3t$ metres. Find its velocity at $t=2\\,\\mathrm{s}$.',
      steps: [
        'Differentiate position: $v(t)=s\\prime(t)=4t+3\\,\\mathrm{m/s}$.',
        'Substitute $t=2$: $v(2)=4(2)+3$.',
        'The instantaneous velocity is $11\\,\\mathrm{m/s}$.',
      ],
    },
    check: {
      question: 'If position is measured in metres and time in seconds, what are the units of velocity?',
      options: ['m', 's', 'm/s', 'm/s²'],
      answer: 'm/s',
      explanation: 'Velocity is position change divided by time change, so its units are metres per second.',
    },
    practice: { kind: 'skill', value: 'Derivatives', label: 'Practice derivatives' },
  },
  {
    id: 'chain-rule-circuits',
    unit: '02 · Differentiation',
    title: 'The chain rule in a circuit',
    subtitle: 'Differentiate a nested signal and keep its units.',
    minutes: 9,
    summary: 'Use the chain rule to find the instantaneous voltage slope of an RC response.',
    objectives: ['Recognize a function inside another function', 'Apply the chain rule', 'Interpret a positive slope in circuit terms'],
    sections: [
      {
        heading: 'A changing exponential',
        paragraphs: [
          'The RC charging curve contains an exponential whose exponent also depends on time. The chain rule handles this nesting: differentiate the outer exponential, then multiply by the derivative of its inner exponent.',
          'For the model below, $V_s$ is the supply voltage and $\\tau$ is the time constant. If time is in milliseconds, voltage slope is measured in volts per millisecond.',
        ],
        formula: String.raw`V(t)=V_s\left(1-e^{-t/\tau}\right)`,
      },
      {
        heading: 'Differentiate, then evaluate',
        paragraphs: [
          'The derivative is largest at the start and decreases as the capacitor charges. At t = 0, the exponential term equals one, leaving the simple starting slope V_s divided by τ.',
        ],
        formula: String.raw`\frac{dV}{dt}=\frac{V_s}{\tau}e^{-t/\tau},\qquad \left.\frac{dV}{dt}\right|_{t=0}=\frac{V_s}{\tau}`,
        note: 'A positive derivative means the voltage is rising at that instant.',
      },
    ],
    example: {
      title: 'Initial voltage slope',
      setup: 'A 10 V supply charges an RC circuit with a 7 ms time constant. Find the initial slope.',
      steps: [
        'Use $\\frac{dV}{dt}=\\frac{V_s}{\\tau}e^{-t/\\tau}$.',
        'At $t=0$, $e^0=1$, so the slope is $\\frac{10}{7}\\,\\mathrm{V/ms}$.',
        'The voltage initially rises at about $1.43\\,\\mathrm{V/ms}$.',
      ],
    },
    check: {
      question: 'What does the positive initial derivative tell you?',
      options: ['Voltage is rising', 'Voltage is falling', 'Voltage is constant', 'Current is zero'],
      answer: 'Voltage is rising',
      explanation: 'A positive rate of change means the voltage is increasing at that instant.',
    },
    practice: { kind: 'applied', value: 'Electronics', label: 'Practice circuit applications' },
  },
  {
    id: 'optimization-design',
    unit: '03 · Engineering applications',
    title: 'Optimize a design',
    subtitle: 'Use a derivative to find the best dimensions under a constraint.',
    minutes: 8,
    summary: 'Translate a physical constraint into a function, then locate its maximum.',
    objectives: ['Build an objective function', 'Find critical points', 'Use the second derivative to classify a maximum'],
    sections: [
      {
        heading: 'Turn the constraint into one variable',
        paragraphs: [
          'Suppose a rectangular enclosure has a fixed perimeter. Once one side is called x, the other side is determined by the perimeter. The area becomes a one-variable function.',
          'A maximum or minimum inside the domain occurs where the first derivative is zero or undefined. The second derivative helps classify the critical point.',
        ],
        formula: String.raw`A(x)=x\left(\frac{P}{2}-x\right)`,
      },
      {
        heading: 'Check that the critical point is a maximum',
        paragraphs: ['A negative second derivative means the area curve is concave down at the critical point, so the design gives a local maximum.'],
        formula: String.raw`A'(x)=0,\qquad A''(x)<0`,
      },
    ],
    example: {
      title: 'A 40 m test enclosure',
      setup: 'A rectangle has 40 m of rail. What dimensions maximize the area?',
      steps: [
        'Write the area as $A(x)=x(20-x)$.',
        'Differentiate: $A\\prime(x)=20-2x$. Set it to zero to get $x=10\\,\\mathrm{m}$.',
        'The other side is also $10\\,\\mathrm{m}$, and $A\\prime\\prime(x)=-2<0$, so the maximum-area design is a square.',
      ],
    },
    check: {
      question: 'For a fixed perimeter, which rectangle has the greatest area?',
      options: ['A square', 'A long, narrow rectangle', 'A triangle', 'All shapes have equal area'],
      answer: 'A square',
      explanation: 'With a fixed perimeter, setting the derivative of area to zero gives equal side lengths; the second derivative confirms a maximum.',
    },
    practice: { kind: 'applied', value: 'Engineering', label: 'Practice design optimization' },
  },
  {
    id: 'integrals-accumulation',
    unit: '04 · Integration',
    title: 'Integrals measure accumulation',
    subtitle: 'Add tiny changes to recover a total quantity.',
    minutes: 8,
    summary: 'Connect current to charge and area under a curve to accumulated change.',
    objectives: ['Interpret a definite integral as accumulated quantity', 'Relate current and charge', 'Use the power rule for antiderivatives'],
    sections: [
      {
        heading: 'Accumulation is the inverse idea',
        paragraphs: [
          'A derivative describes a rate at an instant. An integral adds that rate over an interval to recover the total change.',
          'For a capacitor, current is the rate of change of charge. Integrating current over time gives the change in charge.',
        ],
        formula: String.raw`Q(t)-Q(0)=\int_0^t I(u)\,du`,
      },
      {
        heading: 'The fundamental theorem',
        paragraphs: ['If a function F is an antiderivative of f, the definite integral from a to b is F(b) − F(a). This is the bridge between local rates and accumulated totals.'],
        formula: String.raw`\int_a^b f(x)\,dx=F(b)-F(a)`,
      },
    ],
    example: {
      title: 'Accumulate current',
      setup: 'A sensor current is $I(t)=3t\\,\\mathrm{A}$. If the initial charge is zero, how much charge accumulates in $2\\,\\mathrm{s}$?',
      steps: [
        'Integrate the current: $Q(t)=\\int_0^t 3u\\,du$.',
        'An antiderivative of $3u$ is $\\frac{3}{2}u^2$.',
        'Evaluate from 0 to 2: $Q(2)=\\frac{3}{2}(2)^2=6\\,\\mathrm{C}$.',
      ],
    },
    check: {
      question: 'What does integrating current over time give?',
      options: ['Change in charge', 'Voltage', 'Resistance', 'Power'],
      answer: 'Change in charge',
      explanation: 'Current is charge per unit time, so its time integral is accumulated charge.',
    },
    practice: { kind: 'skill', value: 'Integrals', label: 'Practice integrals' },
  },
  {
    id: 'gradients-learning',
    unit: '05 · Computing applications',
    title: 'Gradients train a model',
    subtitle: 'See how derivatives guide an optimization algorithm.',
    minutes: 9,
    summary: 'Use the gradient of a loss function to update a model parameter.',
    objectives: ['Interpret a derivative as a loss slope', 'Follow a gradient-descent update', 'Understand the role of learning rate'],
    sections: [
      {
        heading: 'A loss curve has a slope',
        paragraphs: [
          'Machine learning often defines a loss function that measures prediction error. The derivative tells us how the loss changes when a parameter changes.',
          'Gradient descent moves a parameter in the direction that reduces the loss. The learning rate controls how large each update is.',
        ],
        formula: String.raw`w_{k+1}=w_k-\eta\,\frac{dL}{dw}(w_k)`,
      },
      {
        heading: 'A one-dimensional example',
        paragraphs: ['For a bowl-shaped loss, the derivative points uphill. Subtracting a learning-rate-scaled derivative moves the weight downhill toward a minimum.'],
        formula: String.raw`L(w)=(w-r)^2,\qquad \frac{dL}{dw}=2(w-r)`,
      },
    ],
    example: {
      title: 'One gradient step',
      setup: 'For $L(w)=(w-3)^2$, start at $w=5$ with learning rate $0.1$. Find the next weight.',
      steps: [
        'Differentiate: $\\frac{dL}{dw}=2(w-3)$.',
        'At $w=5$, the gradient is $2(5-3)=4$.',
        'Update: $w_{next}=5-0.1(4)=4.6$.',
      ],
    },
    check: {
      question: 'With a positive gradient, gradient descent updates the weight by…',
      options: ['Subtracting a learning-rate-scaled gradient', 'Adding the full loss', 'Setting the weight to zero', 'Increasing the learning rate automatically'],
      answer: 'Subtracting a learning-rate-scaled gradient',
      explanation: 'The update rule moves opposite the gradient to reduce the loss.',
    },
    practice: { kind: 'applied', value: 'Computer Science', label: 'Practice gradient descent' },
  },
  {
    id: 'matrix-systems',
    unit: '06 · Computing tools',
    title: 'Matrices organize systems',
    subtitle: 'Use compact arrays to represent and solve many equations at once.',
    minutes: 7,
    summary: 'Read matrix notation and connect linear systems to engineering models.',
    objectives: ['Interpret matrix rows and columns', 'Understand matrix-vector multiplication', 'Recognize when a determinant signals invertibility'],
    sections: [
      {
        heading: 'A matrix is an organized linear map',
        paragraphs: [
          'A matrix stores coefficients in rows and columns. Multiplying a matrix by a vector combines inputs into outputs, which is useful for circuit networks, coordinate transforms, and coupled systems.',
          'For a square matrix, a nonzero determinant means the associated linear system has a unique solution.',
        ],
        formula: String.raw`A\mathbf{x}=\mathbf{b},\qquad \det(A)\ne0`,
      },
      {
        heading: 'Connect the tools',
        paragraphs: ['Matrix calculations are not derivatives, but they frequently appear beside calculus in numerical modeling, state-space control, and scientific computing.'],
        formula: String.raw`\mathbf{x}_{k+1}=\mathbf{x}_k-\eta\nabla L(\mathbf{x}_k)`,
      },
    ],
    example: {
      title: 'Check whether a system is invertible',
      setup: 'For $A=\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$, find the determinant.',
      steps: [
        'For $A=\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}$, $\\det(A)=ad-bc$.',
        'Substitute the entries: $\\det(A)=1(4)-2(3)$.',
        'The determinant is $-2$, so this matrix is invertible.',
      ],
    },
    check: {
      question: 'What does a nonzero determinant tell you about a square matrix?',
      options: ['It is invertible', 'Every entry is positive', 'It has no rows', 'Its trace is zero'],
      answer: 'It is invertible',
      explanation: 'A nonzero determinant means the matrix has an inverse and the associated square system has a unique solution.',
    },
    practice: { kind: 'matrix', value: 'Matrix math', label: 'Try the matrix calculator' },
  },
]
