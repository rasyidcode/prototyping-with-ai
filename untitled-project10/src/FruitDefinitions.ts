import * as THREE from 'three';

export interface FruitType {
  level: number;
  name: string;
  radius: number;
  color: string;
  score: number;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission?: number;
}

export const FRUIT_TYPES: FruitType[] = [
  { level: 0, name: 'Cherry', radius: 0.35, color: '#ff1e3c', score: 1, roughness: 0.1, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05 },
  { level: 1, name: 'Strawberry', radius: 0.48, color: '#ff3b69', score: 3, roughness: 0.2, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.1 },
  { level: 2, name: 'Grape', radius: 0.62, color: '#8d3bff', score: 6, roughness: 0.1, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.05, transmission: 0.5 },
  { level: 3, name: 'Dekopon', radius: 0.76, color: '#ff922b', score: 10, roughness: 0.4, metalness: 0.0, clearcoat: 0.5, clearcoatRoughness: 0.2 },
  { level: 4, name: 'Persimmon', radius: 0.90, color: '#f76707', score: 15, roughness: 0.2, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.1 },
  { level: 5, name: 'Apple', radius: 1.05, color: '#e03131', score: 21, roughness: 0.15, metalness: 0.1, clearcoat: 0.9, clearcoatRoughness: 0.08 },
  { level: 6, name: 'Pear', radius: 1.25, color: '#d3f9d8', score: 28, roughness: 0.3, metalness: 0.0, clearcoat: 0.4, clearcoatRoughness: 0.15 },
  { level: 7, name: 'Peach', radius: 1.45, color: '#ffa8a8', score: 36, roughness: 0.5, metalness: 0.0, clearcoat: 0.2, clearcoatRoughness: 0.3 },
  { level: 8, name: 'Pineapple', radius: 1.70, color: '#fab005', score: 45, roughness: 0.4, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  { level: 9, name: 'Melon', radius: 2.00, color: '#8ce99a', score: 55, roughness: 0.35, metalness: 0.0, clearcoat: 0.5, clearcoatRoughness: 0.2 },
  { level: 10, name: 'Watermelon', radius: 2.40, color: '#2b8a3e', score: 66, roughness: 0.15, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.05 }
];

// Helper to create high-quality procedural textures using Canvas
function createProceduralTexture(level: number): THREE.Texture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (level === 1) {
    // Strawberry: seed dots
    ctx.fillStyle = '#ff3b69';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#ffe066';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.ellipse(x, y, 3, 5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (level === 3) {
    // Dekopon (Orange): bumpy skin texture (drawn as tiny dots)
    ctx.fillStyle = '#ff922b';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#e67e22';
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.arc(x, y, 1 + Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (level === 8) {
    // Pineapple: criss-cross diamond grid
    ctx.fillStyle = '#fab005';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 4;
    // Diagonal lines
    for (let i = -512; i < 1024; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 512, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i, 512);
      ctx.lineTo(i + 512, 0);
      ctx.stroke();
    }
    // Centered yellow dots in diamonds
    ctx.fillStyle = '#ffd43b';
    for (let i = 0; i < 512; i += 24) {
      for (let j = 0; j < 512; j += 24) {
        if ((i + j) % 48 === 0) {
          ctx.beginPath();
          ctx.arc(i + 12, j + 12, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  } else if (level === 9) {
    // Melon: textured netting
    ctx.fillStyle = '#8ce99a';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#e2f9e6';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw wavy netting
    for (let i = 0; i < 512; i += 60) {
      ctx.beginPath();
      for (let y = 0; y <= 512; y += 10) {
        const x = i + Math.sin(y * 0.05) * 15;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 512; i += 60) {
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 10) {
        const y = i + Math.cos(x * 0.05) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (level === 10) {
    // Watermelon: green stripes
    ctx.fillStyle = '#2b8a3e';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#0b3d16';

    // Draw dark vertical wavy stripes
    const numStripes = 8;
    for (let s = 0; s < numStripes; s++) {
      const centerX = (s + 0.5) * (512 / numStripes);
      ctx.beginPath();
      for (let y = 0; y <= 512; y += 5) {
        const xOffset = Math.sin(y * 0.08) * 15 + Math.cos(y * 0.03) * 10;
        const width = 20 + Math.sin(y * 0.04) * 8;
        const lx = centerX + xOffset - width / 2;
        if (y === 0) ctx.moveTo(lx, y);
        else ctx.lineTo(lx, y);
      }
      for (let y = 512; y >= 0; y -= 5) {
        const xOffset = Math.sin(y * 0.08) * 15 + Math.cos(y * 0.03) * 10;
        const width = 20 + Math.sin(y * 0.04) * 8;
        const rx = centerX + xOffset + width / 2;
        ctx.lineTo(rx, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else {
    return null;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Function to generate the beautifully modeled fruit meshes
export function createFruitMesh(level: number): THREE.Group {
  const group = new THREE.Group();
  const info = FRUIT_TYPES[level];

  // Base material configuration
  const materialParams: THREE.MeshPhysicalMaterialParameters = {
    color: new THREE.Color(info.color),
    roughness: info.roughness,
    metalness: info.metalness,
    clearcoat: info.clearcoat,
    clearcoatRoughness: info.clearcoatRoughness,
  };

  // Add procedural textures if defined
  const texture = createProceduralTexture(level);
  if (texture) {
    materialParams.map = texture;
    // For orange and melon, also use as a bump map to create fine displacement
    if (level === 3 || level === 9 || level === 8) {
      materialParams.bumpMap = texture;
      materialParams.bumpScale = level === 3 ? 0.015 : level === 8 ? 0.04 : 0.03;
    }
  }

  // Handle glass-like grapes
  if (info.transmission) {
    materialParams.transmission = info.transmission;
    materialParams.ior = 1.35;
    materialParams.thickness = info.radius * 0.5;
  }

  const material = new THREE.MeshPhysicalMaterial(materialParams);

  // Custom visual modeling based on fruit type
  if (level === 0) {
    // Cherry: smooth sphere + brown stem
    const sphereGeom = new THREE.SphereGeometry(info.radius, 32, 32);
    const cherryMesh = new THREE.Mesh(sphereGeom, material);
    cherryMesh.castShadow = true;
    cherryMesh.receiveShadow = true;
    group.add(cherryMesh);

    // Curved stem
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, info.radius * 0.8, 0),
      new THREE.Vector3(info.radius * 0.3, info.radius * 1.5, info.radius * 0.1),
      new THREE.Vector3(info.radius * 0.6, info.radius * 2.2, info.radius * 0.3),
    ]);
    const stemGeom = new THREE.TubeGeometry(stemCurve, 8, 0.02, 8, false);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
    const stemMesh = new THREE.Mesh(stemGeom, stemMat);
    group.add(stemMesh);

  } else if (level === 1) {
    // Strawberry: tapered cone/sphere shape
    const geom = new THREE.SphereGeometry(info.radius, 32, 32);
    
    // Taper the geometry: pull vertices at the bottom together
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Scale Y slightly to elongate
      y *= 1.1;

      // Taper based on height
      const factor = (y + info.radius) / (2 * info.radius); // 0 at bottom, 1 at top
      const taper = 0.5 + 0.5 * Math.sin(factor * Math.PI / 2);
      x *= taper;
      z *= taper;

      pos.setXYZ(i, x, y, z);
    }
    geom.computeVertexNormals();

    const strawberryMesh = new THREE.Mesh(geom, material);
    strawberryMesh.castShadow = true;
    strawberryMesh.receiveShadow = true;
    group.add(strawberryMesh);

    // Leaf cap at the top (star pattern using flat shapes)
    const leafGroup = new THREE.Group();
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2b8a3e, roughness: 0.6 });
    const leafGeom = new THREE.ConeGeometry(info.radius * 0.4, info.radius * 0.2, 5);
    leafGeom.rotateX(Math.PI); // Point leaves down
    const leafMesh = new THREE.Mesh(leafGeom, leafMat);
    leafMesh.position.y = info.radius * 0.9;
    leafGroup.add(leafMesh);
    group.add(leafGroup);

  } else if (level === 4) {
    // Persimmon: Squashed tomato shape
    const geom = new THREE.SphereGeometry(info.radius, 32, 32);
    geom.scale(1.15, 0.85, 1.15); // Squash along Y
    
    const persimmonMesh = new THREE.Mesh(geom, material);
    persimmonMesh.castShadow = true;
    persimmonMesh.receiveShadow = true;
    group.add(persimmonMesh);

    // Dark brown calyx leaf-leaves on top
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a2c00, roughness: 0.9 });
    const leafGeom = new THREE.BoxGeometry(info.radius * 0.6, 0.03, info.radius * 0.6);
    const leafMesh1 = new THREE.Mesh(leafGeom, leafMat);
    leafMesh1.position.y = info.radius * 0.78;
    leafMesh1.rotation.y = 0.2;
    const leafMesh2 = new THREE.Mesh(leafGeom, leafMat);
    leafMesh2.position.y = info.radius * 0.78;
    leafMesh2.rotation.y = Math.PI / 4 + 0.2;
    group.add(leafMesh1, leafMesh2);

  } else if (level === 5) {
    // Apple: Indented sphere
    const geom = new THREE.SphereGeometry(info.radius, 32, 32);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Create indentations at absolute top and bottom
      const distFromYCenter = Math.abs(y);
      if (distFromYCenter > info.radius * 0.7) {
        const factor = (info.radius - distFromYCenter) / (info.radius * 0.3); // 1 to 0
        const indent = 0.85 + 0.15 * factor;
        x *= indent;
        z *= indent;
        y *= 0.95; // Flatten slightly
      }
      pos.setXYZ(i, x, y, z);
    }
    geom.computeVertexNormals();

    const appleMesh = new THREE.Mesh(geom, material);
    appleMesh.castShadow = true;
    appleMesh.receiveShadow = true;
    group.add(appleMesh);

    // Apple stem
    const stemGeom = new THREE.CylinderGeometry(0.01, 0.02, info.radius * 0.4, 8);
    stemGeom.rotateZ(0.2); // Leaning stem
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const stemMesh = new THREE.Mesh(stemGeom, stemMat);
    stemMesh.position.set(0.05, info.radius * 0.9, 0);
    group.add(stemMesh);

  } else if (level === 6) {
    // Pear: Bell-like pear shape
    const geom = new THREE.SphereGeometry(info.radius, 32, 32);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Elongate top half and make it thin
      if (y > 0) {
        y *= 1.25;
        // Make top portion tapered
        const factor = y / (info.radius * 1.25); // 0 at center, 1 at top
        const taper = 1.0 - 0.55 * Math.pow(factor, 1.2);
        x *= taper;
        z *= taper;
      } else {
        // Squish bottom slightly
        y *= 0.9;
        const factor = -y / (info.radius * 0.9);
        const bulb = 1.0 + 0.1 * Math.sin(factor * Math.PI);
        x *= bulb;
        z *= bulb;
      }
      pos.setXYZ(i, x, y, z);
    }
    geom.computeVertexNormals();

    const pearMesh = new THREE.Mesh(geom, material);
    pearMesh.castShadow = true;
    pearMesh.receiveShadow = true;
    group.add(pearMesh);

    // Stem on top
    const stemGeom = new THREE.CylinderGeometry(0.012, 0.022, info.radius * 0.45, 8);
    stemGeom.rotateZ(-0.35);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x3d2712, roughness: 0.9 });
    const stemMesh = new THREE.Mesh(stemGeom, stemMat);
    stemMesh.position.set(-0.06, info.radius * 1.15, 0);
    group.add(stemMesh);

  } else if (level === 7) {
    // Peach: indented sphere + seam
    const geom = new THREE.SphereGeometry(info.radius, 40, 40);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Peach indentation seam around one vertical line (X=0 plane)
      const distToSeam = Math.abs(x);
      const seamWidth = info.radius * 0.35;
      if (distToSeam < seamWidth) {
        const factor = distToSeam / seamWidth; // 0 to 1
        const depth = 0.06 * (1.0 - Math.pow(factor, 2)) * Math.cos((y / info.radius) * (Math.PI / 2.2));
        // Push inward along the normal
        const shrink = 1.0 - depth;
        x *= shrink;
        z *= shrink;
      }

      // Heart-like point at the top
      if (y > info.radius * 0.6) {
        const factor = (y - info.radius * 0.6) / (info.radius * 0.4);
        y += 0.08 * Math.sin(factor * Math.PI) * info.radius;
      }
      pos.setXYZ(i, x, y, z);
    }
    geom.computeVertexNormals();

    const peachMesh = new THREE.Mesh(geom, material);
    peachMesh.castShadow = true;
    peachMesh.receiveShadow = true;
    group.add(peachMesh);

    // Small decorative leaf
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.15, 0.2, 0, 0.4);
    leafShape.quadraticCurveTo(-0.15, 0.2, 0, 0);
    
    const extrudeSettings = { depth: 0.01, bevelEnabled: false };
    const leafGeom = new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
    leafGeom.center();
    leafGeom.scale(info.radius * 0.3, info.radius * 0.3, info.radius * 0.3);
    leafGeom.rotateX(Math.PI / 2.5);
    leafGeom.rotateY(0.5);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x40c057, roughness: 0.8 });
    const leafMesh = new THREE.Mesh(leafGeom, leafMat);
    leafMesh.position.set(0.1, info.radius * 0.95, 0.1);
    group.add(leafMesh);

  } else if (level === 8) {
    // Pineapple: Oval cylinder + leafy crown
    const geom = new THREE.CylinderGeometry(info.radius * 0.75, info.radius * 0.9, info.radius * 1.5, 32, 16);
    
    // Round the ends of the cylinder to make it an oval pine shape
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Scale radial thickness inward near y-caps
      const halfHeight = info.radius * 0.75;
      const heightFactor = Math.abs(y) / halfHeight; // 0 to 1
      if (heightFactor > 0.0) {
        const scale = Math.sqrt(1.0 - 0.4 * Math.pow(heightFactor, 2));
        x *= scale;
        z *= scale;
      }
      pos.setXYZ(i, x, y, z);
    }
    geom.computeVertexNormals();

    const bodyMesh = new THREE.Mesh(geom, material);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Spiky crown on top
    const crown = new THREE.Group();
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2b8a3e, roughness: 0.7 });
    
    // Create multiple tiers of leaf spikes
    for (let tier = 0; tier < 3; tier++) {
      const numLeaves = 8 - tier * 2;
      const tierHeight = info.radius * (0.65 + tier * 0.1);
      const tierScale = 1.0 - tier * 0.25;

      for (let l = 0; l < numLeaves; l++) {
        const angle = (l / numLeaves) * Math.PI * 2 + (tier * 0.5);
        const spikeGeom = new THREE.ConeGeometry(0.12 * info.radius, 0.8 * info.radius, 4);
        spikeGeom.scale(1, 1, 0.2); // Flat blade-like leaves
        
        const spikeMesh = new THREE.Mesh(spikeGeom, leafMat);
        spikeMesh.position.set(
          Math.cos(angle) * 0.18 * info.radius * tierScale,
          tierHeight + 0.15 * info.radius * tier,
          Math.sin(angle) * 0.18 * info.radius * tierScale
        );
        spikeMesh.rotation.y = -angle;
        spikeMesh.rotation.x = 0.35 + tier * 0.2;
        
        crown.add(spikeMesh);
      }
    }
    group.add(crown);

  } else {
    // Grapes, Oranges, Apples, Melons, and Watermelons that are basically spherical with textures
    const sphereGeom = new THREE.SphereGeometry(info.radius, 32, 32);
    const mesh = new THREE.Mesh(sphereGeom, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Set the visual bounding sphere so it looks correct at its radius
  group.scale.set(1, 1, 1);
  return group;
}
