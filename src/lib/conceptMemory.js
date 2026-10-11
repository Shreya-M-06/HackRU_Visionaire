// In-memory helpers for the first MVP. Persistence can be added later with Supabase.

export function getNodeDescription(node) {
  return node?.data?.description || node?.data?.summary || node?.data?.detail || "";
}

export function getParentId(node) {
  return node?.data?.parentId || null;
}

export function getAncestorPath(nodeId, nodes) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const path = [];
  let current = byId.get(nodeId);
  const visited = new Set();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift({
      id: current.id,
      label: current.data?.title || current.data?.plainLabel || current.id,
      description: getNodeDescription(current),
    });
    current = byId.get(getParentId(current));
  }
  return path;
}

export function getDescendantSummaries(nodeId, nodes, summaries) {
  const childrenByParent = new Map();
  for (const node of nodes) {
    const parentId = getParentId(node);
    if (!parentId) continue;
    const children = childrenByParent.get(parentId) || [];
    children.push(node);
    childrenByParent.set(parentId, children);
  }

  const result = [];
  const stack = [...(childrenByParent.get(nodeId) || [])];
  const visited = new Set([nodeId]);

  while (stack.length && result.length < 30) {
    const current = stack.pop();
    if (!current || visited.has(current.id)) continue;
    visited.add(current.id);

    const summary = summaries[current.id];
    if (summary) {
      result.push({
        id: current.id,
        label: current.data?.title || current.data?.plainLabel || current.id,
        summary,
      });
    }
    stack.push(...(childrenByParent.get(current.id) || []));
  }
  return result;
}
