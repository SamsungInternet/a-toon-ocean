/*global AFRAME */
AFRAME.registerShader('gradient2', {
  schema: {
    color1: {type: 'color', is: 'uniform', default: 'red'},
    color2: {type: 'color', is: 'uniform', default: 'green'},
    stops: { type: 'vec2', is: 'uniform', default: '0 1' },
    opacity: { is: 'uniform', default: 1 },
    angle: { is: 'uniform', default: 90 }
  },
  fragmentShader: `
    varying vec2 vUv;
    
    uniform vec3 color1;
    uniform vec3 color2;
    uniform vec2 stops;
    uniform float opacity;
    uniform float angle;

    void main() {
      float degToRad = 0.01745329;
      float t = vUv.x*cos(angle * degToRad) + vUv.y*sin(angle * degToRad);
      gl_FragColor.a = opacity;
      gl_FragColor.rgb = mix(color1, color2, smoothstep(stops.x,stops.y,t));
    }`,
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
});

AFRAME.registerShader('gradient3', {
  schema: {
    color1: {type: 'color', is: 'uniform', default: 'red'},
    color2: {type: 'color', is: 'uniform', default: 'green'},
    color3: {type: 'color', is: 'uniform', default: 'blue'},
    stops: { type: 'vec3', is: 'uniform', default: '0 0.5 1' },
    opacity: { is: 'uniform', default: 1 },
    angle: { is: 'uniform', default: 90 }
  },
  fragmentShader: `
    varying vec2 vUv;
    
    uniform vec3 color1;
    uniform vec3 color2;
    uniform vec3 color3;
    uniform vec3 stops;
    uniform float opacity;
    uniform float angle;

    void main() {
      float degToRad = 0.01745329;
      float t = vUv.x*cos(angle * degToRad) + vUv.y*sin(angle * degToRad);
      gl_FragColor.a = opacity;
      gl_FragColor.rgb = mix(color1, color2, smoothstep(stops.x,stops.y,t));
      if (t > stops.y) gl_FragColor.rgb = mix(color2, color3, smoothstep(stops.y,stops.z,t));
    }`,
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
});

AFRAME.registerShader('gradient4', {
  schema: {
    color1: {type: 'color', is: 'uniform', default: 'red'},
    color2: {type: 'color', is: 'uniform', default: 'green'},
    color3: {type: 'color', is: 'uniform', default: 'blue'},
    color4: {type: 'color', is: 'uniform', default: 'yellow'},
    stops: { type: 'vec4', is: 'uniform', default: '0 0.33 0.66 1' },
    opacity: { is: 'uniform', default: 1 },
    angle: { is: 'uniform', default: 90 }
  },
  fragmentShader: `
    varying vec2 vUv;
    
    uniform vec3 color1;
    uniform vec3 color2;
    uniform vec3 color3;
    uniform vec3 color4;
    uniform vec4 stops;
    uniform float opacity;
    uniform float angle;

    void main() {
      float degToRad = 0.01745329;
      float t = vUv.x*cos(angle * degToRad) + vUv.y*sin(angle * degToRad);
      gl_FragColor.a = opacity;
      gl_FragColor.rgb = mix(color1, color2, smoothstep(stops.x,stops.y,t));
      if (t > stops.y) gl_FragColor.rgb = mix(color2, color3, smoothstep(stops.y,stops.z,t));
      if (t > stops.z) gl_FragColor.rgb = mix(color3, color4, smoothstep(stops.z,stops.w,t));
    }`,
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
});