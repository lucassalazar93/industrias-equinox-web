// Entorno de estudio para que el acero inoxidable se vea real.
// Un metal no tiene color propio: muestra lo que refleja. Con un cuarto blanco parejo (RoomEnvironment)
// el inox se ve como plástico gris claro; aquí la sala tiene franjas de luz tipo softbox y paneles oscuros,
// así el acero muestra brillos alargados y bordes con contraste, como en una foto de producto.
// Ojo: la cámara mira desde arriba, así que las caras verticales reflejan sobre todo el piso del entorno;
// por eso ese piso es gris medio (como el epóxico de la sala) y no negro: si no, el equipo se ve oscuro.
// Lo usan Arma tu planta, el visor de las fichas y el tanque de la portada.
import * as THREE from 'three';

export function entornoAcero(renderer) {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0xa7afbc);
  const luz = (intensidad, color = 0xffffff) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensidad), side: THREE.DoubleSide });
  const panel = (w, h, material, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    m.position.set(...pos); m.rotation.set(...rot); escena.add(m);
  };
  // Sala gris claro con piso gris medio (lo que reflejan las caras verticales vistas desde arriba)
  const sala = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 24), new THREE.MeshBasicMaterial({ color: 0xb4bcc8, side: THREE.BackSide }));
  sala.position.y = 4; escena.add(sala);
  panel(24, 24, new THREE.MeshBasicMaterial({ color: 0x737c89 }), [0, -1.99, 0], [-Math.PI / 2, 0, 0]);
  // Horizonte de estudio en las cuatro paredes: arriba claro, franja oscura a la altura de los ojos y abajo gris medio.
  // Es lo que le da al inox su degradado y la línea oscura que lo delata como metal, en tanques y en caras planas.
  const franja = (color, y0, y1) => {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(23.8, y1 - y0), mat);
      m.position.set(Math.sin(a) * 11.95, (y0 + y1) / 2, Math.cos(a) * 11.95);
      m.rotation.y = a + Math.PI;
      escena.add(m);
    }
  };
  franja(0xc9d0da, 2.4, 9.8);
  franja(0x4a515d, 0.2, 2.4);
  franja(0x868e9b, -1.98, 0.2);
  // Paneles oscuros angostos a los lados: acentos de contraste en los bordes del inox
  const negro = new THREE.MeshBasicMaterial({ color: 0x23262d, side: THREE.DoubleSide });
  panel(1.6, 6, negro, [-11.85, 4.5, -6], [0, Math.PI / 2, 0]);
  panel(1.6, 6, negro, [11.85, 4.5, 5], [0, -Math.PI / 2, 0]);
  panel(4, 2, negro, [-5, 6, 11.85], [0, Math.PI, 0]);
  // Franjas de luz: dos en el techo, una a cada lado, una fría de contorno atrás y una cálida suave al frente
  panel(14, 1.8, luz(9), [0, 9.9, -2], [Math.PI / 2, 0, 0]);
  panel(14, 1.1, luz(6), [0, 9.9, 3.5], [Math.PI / 2, 0, 0]);
  panel(1.4, 7, luz(7), [-11.9, 4, 1.5], [0, Math.PI / 2, 0]);
  panel(1.4, 7, luz(5), [11.9, 4, -2.5], [0, -Math.PI / 2, 0]);
  panel(9, 1.2, luz(3, 0xcfe0ff), [0, 3, -11.9], [0, 0, 0]);
  panel(6, 2.5, luz(2.2, 0xfff1dc), [4, 3, 11.9], [0, Math.PI, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const textura = pmrem.fromScene(escena, 0.02).texture;
  pmrem.dispose();
  escena.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return textura;
}
