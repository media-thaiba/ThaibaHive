export interface TopologyNode {
  id: string;
  tier: 'local' | 'regional' | 'global';
  status: 'active' | 'partitioned' | 'offline';
  lastSeen: string;
}

export class SwarmTopology {
  private nodes = new Map<string, TopologyNode>();
  
  register(node: TopologyNode) {
    this.nodes.set(node.id, node);
  }
  
  updateStatus(id: string, status: TopologyNode['status']) {
    const node = this.nodes.get(id);
    if (node) {
      node.status = status;
      node.lastSeen = new Date().toISOString();
    }
  }
  
  getGlobalView() {
    return Array.from(this.nodes.values());
  }
}