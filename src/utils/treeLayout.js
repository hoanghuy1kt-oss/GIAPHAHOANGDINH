/**
 * Custom Tree Layout Algorithm for Vietnamese Family Tree
 * Centers parents above children, places spouses side-by-side,
 * and recursively computes subtree widths.
 */

const NODE_WIDTH = 140;
const NODE_HEIGHT = 185;
const SPOUSE_GAP = 25; // Gap between husband and wife
const SIBLING_GAP = 60; // Horizontal gap between siblings
const GENERATION_HEIGHT = 270; // Vertical gap between generations

export function calculateTreeLayout(members) {
  if (!members || members.length === 0) return { nodes: [], links: [] };

  // 1. Index members by ID
  const memberMap = {};
  members.forEach(m => {
    memberMap[m.id] = { ...m, children: [] };
  });

  // 2. Build children relationships (patrilineal)
  const rootIds = [];
  Object.values(memberMap).forEach(m => {
    if (m.fatherId && memberMap[m.fatherId]) {
      memberMap[m.fatherId].children.push(m.id);
    } else if (m.motherId && memberMap[m.motherId]) {
      // Fallback to mother if no father
      memberMap[m.motherId].children.push(m.id);
    } else {
      // If a member is a wife and has a spouse who is in the tree,
      // she is not a root anchor (her husband is the anchor).
      const isWifeWithSpouse = m.gender === "Nữ" && m.spouseId && memberMap[m.spouseId];
      if (!isWifeWithSpouse) {
        rootIds.push(m.id);
      }
    }
  });

  // 3. Recursive Pass 1: Compute subtree widths for anchors
  // We only calculate widths for "anchor" nodes (males/husbands or single members).
  // Spouses are placed next to them and count towards their width.
  function computeSubtreeWidth(nodeId) {
    const node = memberMap[nodeId];
    if (!node) return 0;

    const hasSpouse = node.spouseId && memberMap[node.spouseId];
    const coupleWidth = hasSpouse ? (NODE_WIDTH * 2 + SPOUSE_GAP) : NODE_WIDTH;

    if (node.children.length === 0) {
      node.subtreeWidth = coupleWidth;
      return node.subtreeWidth;
    }

    let childrenWidth = 0;
    node.children.forEach((childId, idx) => {
      childrenWidth += computeSubtreeWidth(childId);
      if (idx < node.children.length - 1) {
        childrenWidth += SIBLING_GAP;
      }
    });

    node.subtreeWidth = Math.max(coupleWidth, childrenWidth);
    return node.subtreeWidth;
  }

  // Compute widths for all root nodes
  rootIds.forEach(id => computeSubtreeWidth(id));

  // 4. Recursive Pass 2: Assign coordinates (X, Y)
  const positionedNodes = {};
  const links = [];

  function assignPositions(nodeId, centerX, currentGen, yOffset) {
    const node = memberMap[nodeId];
    if (!node || positionedNodes[nodeId]) return;

    const hasSpouse = node.spouseId && memberMap[node.spouseId];
    const currentY = yOffset + (currentGen - 1) * GENERATION_HEIGHT;

    let husbandX, wifeX;
    if (hasSpouse) {
      // Place husband on left, wife on right
      const coupleWidth = NODE_WIDTH * 2 + SPOUSE_GAP;
      husbandX = centerX - coupleWidth / 2 + NODE_WIDTH / 2;
      wifeX = centerX + coupleWidth / 2 - NODE_WIDTH / 2;

      positionedNodes[nodeId] = {
        ...node,
        x: husbandX - NODE_WIDTH / 2,
        y: currentY
      };

      const spouseNode = memberMap[node.spouseId];
      positionedNodes[node.spouseId] = {
        ...spouseNode,
        x: wifeX - NODE_WIDTH / 2,
        y: currentY
      };

      // Add spouse link (double line or gold line)
      links.push({
        type: "spouse",
        from: { x: husbandX + NODE_WIDTH / 2, y: currentY + NODE_HEIGHT / 2 },
        to: { x: wifeX - NODE_WIDTH / 2, y: currentY + NODE_HEIGHT / 2 }
      });
    } else {
      positionedNodes[nodeId] = {
        ...node,
        x: centerX - NODE_WIDTH / 2,
        y: currentY
      };
    }

    // Position children
    if (node.children.length > 0) {
      let totalChildrenWidth = 0;
      node.children.forEach((childId, idx) => {
        totalChildrenWidth += memberMap[childId].subtreeWidth;
        if (idx < node.children.length - 1) {
          totalChildrenWidth += SIBLING_GAP;
        }
      });

      let startX = centerX - totalChildrenWidth / 2;
      const parentJointX = centerX;
      const parentJointY = hasSpouse ? (currentY + NODE_HEIGHT / 2) : (currentY + NODE_HEIGHT);
      const splitY = currentY + NODE_HEIGHT + (GENERATION_HEIGHT - NODE_HEIGHT) / 2;

      // Draw vertical stem down from parents
      links.push({
        type: "parent-stem",
        from: { x: parentJointX, y: parentJointY },
        to: { x: parentJointX, y: splitY }
      });

      const childJoints = [];

      node.children.forEach((childId) => {
        const child = memberMap[childId];
        const childCenterX = startX + child.subtreeWidth / 2;

        // Position child
        assignPositions(childId, childCenterX, currentGen + 1, yOffset);

        const childY = currentY + GENERATION_HEIGHT;
        const childHasSpouse = child.spouseId && memberMap[child.spouseId];
        const childJointX = childHasSpouse
          ? (childCenterX - NODE_WIDTH / 2 - SPOUSE_GAP / 2)
          : childCenterX;
        const childJointY = childY;

        // Draw stem up from child
        links.push({
          type: "child-stem",
          from: { x: childJointX, y: splitY },
          to: { x: childJointX, y: childJointY }
        });

        childJoints.push(childJointX);
        startX += child.subtreeWidth + SIBLING_GAP;
      });

      // Draw horizontal connector bar between children stems
      if (childJoints.length > 0) {
        const minX = Math.min(...childJoints, parentJointX);
        const maxX = Math.max(...childJoints, parentJointX);
        links.push({
          type: "connector-bar",
          from: { x: minX, y: splitY },
          to: { x: maxX, y: splitY }
        });
      }
    }
  }

  // Position all roots
  let totalRootWidth = 0;
  rootIds.forEach((id, idx) => {
    totalRootWidth += memberMap[id].subtreeWidth;
    if (idx < rootIds.length - 1) {
      totalRootWidth += SIBLING_GAP * 2;
    }
  });

  let currentRootX = 400; // Left margin/offset
  rootIds.forEach(id => {
    const rootWidth = memberMap[id].subtreeWidth;
    const rootGen = memberMap[id].generation || 1;
    assignPositions(id, currentRootX + rootWidth / 2, rootGen, 80);
    currentRootX += rootWidth + SIBLING_GAP * 2;
  });

  return {
    nodes: Object.values(positionedNodes),
    links: links,
    dimensions: {
      width: Math.max(currentRootX + 200, 1600),
      height: Math.max(members.reduce((max, m) => Math.max(max, m.generation || 1), 1) * GENERATION_HEIGHT + 200, 800)
    }
  };
}
