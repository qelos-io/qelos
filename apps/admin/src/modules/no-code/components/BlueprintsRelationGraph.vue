<template>
  <div class="blueprint-relations-graph">
    <div class="graph-container" ref="graphContainer">
      <!-- SVG for drawing lines between blueprints -->
      <svg class="relations-svg" ref="relationsSvg"></svg>
      
      <!-- Blueprint nodes -->
      <div 
        v-for="blueprint in blueprints" 
        :key="blueprint.identifier"
        :id="'graph-node-' + blueprint.identifier"
        class="blueprint-node"
        :class="{ 'node-selected': selectedBlueprint?.identifier === blueprint.identifier }"
        @click="selectBlueprint(blueprint)"
      >
        <div class="node-content">
          <div class="node-title">{{ blueprint.name }}</div>
          <div class="node-description">{{ blueprint.description }}</div>
        </div>
      </div>
    </div>
    
    <!-- Blueprint details panel -->
    <BlueprintDetailsPanel
      v-if="selectedBlueprint"
      :blueprint="selectedBlueprint"
      :blueprints="blueprints"
      @select="selectBlueprint"
      @select-by-identifier="selectBlueprintByIdentifier"
      @close="selectedBlueprint = null"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { IBlueprint } from '@qelos/global-types';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import BlueprintDetailsPanel from './BlueprintDetailsPanel.vue';

const props = defineProps<{
  blueprints: IBlueprint[];
}>();

const emit = defineEmits<{
  (e: 'select', blueprint: IBlueprint | null): void;
}>();

const store = useBlueprintsStore();
const selectedBlueprint = ref<IBlueprint | null>(null);
const graphContainer = ref<HTMLElement | null>(null);
const relationsSvg = ref<SVGElement | null>(null);



// Select a blueprint
function selectBlueprint(blueprint: IBlueprint | null) {
  selectedBlueprint.value = blueprint;
  emit('select', blueprint);
}

// Select a blueprint by identifier
function selectBlueprintByIdentifier(identifier: string) {
  const blueprint = props.blueprints.find(bp => bp.identifier === identifier);
  if (blueprint) {
    selectBlueprint(blueprint);
  }
}

// Draw relations between blueprints
function drawRelations() {
  if (!graphContainer.value || !relationsSvg.value || !props.blueprints.length) return;
  
  // Clear previous lines
  relationsSvg.value.innerHTML = '';
  
  // Set SVG dimensions to match container
  const containerRect = graphContainer.value.getBoundingClientRect();
  relationsSvg.value.setAttribute('width', `${containerRect.width}px`);
  relationsSvg.value.setAttribute('height', `${containerRect.height}px`);
  
  // Draw lines for each relation
  props.blueprints.forEach(blueprint => {
    blueprint.relations.forEach(relation => {
      const sourceNode = document.getElementById(`graph-node-${blueprint.identifier}`);
      const targetNode = document.getElementById(`graph-node-${relation.target}`);
      
      if (sourceNode && targetNode) {
        const sourceRect = sourceNode.getBoundingClientRect();
        const targetRect = targetNode.getBoundingClientRect();
        
        // Calculate positions relative to the SVG
        const sourceX = sourceRect.left - containerRect.left + sourceRect.width / 2;
        const sourceY = sourceRect.top - containerRect.top + sourceRect.height / 2;
        const targetX = targetRect.left - containerRect.left + targetRect.width / 2;
        const targetY = targetRect.top - containerRect.top + targetRect.height / 2;
        
        // Create line element
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sourceX.toString());
        line.setAttribute('y1', sourceY.toString());
        line.setAttribute('x2', targetX.toString());
        line.setAttribute('y2', targetY.toString());
        line.setAttribute('stroke', '#409EFF');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        
        // Add relation info as data attributes
        line.dataset.source = blueprint.identifier;
        line.dataset.target = relation.target;
        line.dataset.key = relation.key;
        
        // Add class for styling
        line.classList.add('relation-line');
        
        // Highlight related lines when a blueprint is selected
        if (selectedBlueprint.value) {
          if (blueprint.identifier === selectedBlueprint.value.identifier || 
              relation.target === selectedBlueprint.value.identifier) {
            line.classList.add('relation-highlighted');
          } else {
            line.classList.add('relation-dimmed');
          }
        }
        
        relationsSvg.value?.appendChild(line);
      }
    });
  });
  
  // Add arrow marker definition
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'arrowhead');
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '3.5');
  marker.setAttribute('orient', 'auto');
  
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
  polygon.setAttribute('fill', '#409EFF');
  
  marker.appendChild(polygon);
  defs.appendChild(marker);
  relationsSvg.value.appendChild(defs);
}

// Position blueprint nodes in a force-directed layout
function positionNodes() {
  if (!graphContainer.value || !props.blueprints.length) return;
  
  const containerWidth = graphContainer.value.clientWidth;
  const containerHeight = graphContainer.value.clientHeight;
  
  // Simple circular layout
  const radius = Math.min(containerWidth, containerHeight) * 0.4;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  
  props.blueprints.forEach((blueprint, index) => {
    const angle = (index / props.blueprints.length) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    const node = document.getElementById(`graph-node-${blueprint.identifier}`);
    if (node) {
      node.style.left = `${x - node.clientWidth / 2}px`;
      node.style.top = `${y - node.clientHeight / 2}px`;
    }
  });
  
  // Draw relation lines after positioning nodes
  drawRelations();
}

// Initialize the graph
onMounted(() => {
  nextTick(() => {
    positionNodes();
    window.addEventListener('resize', () => {
      positionNodes();
    });
  });
});

// Redraw when blueprints or selection changes
watch(() => props.blueprints, () => {
  nextTick(() => {
    positionNodes();
  });
}, { deep: true });

watch(() => selectedBlueprint.value, () => {
  nextTick(() => {
    drawRelations();
  });
});
</script>

<style scoped>
.blueprint-relations-graph {
  display: flex;
  height: 100%;
  min-height: 600px;
}

.graph-container {
  position: relative;
  flex: 1;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.relations-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.blueprint-node {
  position: absolute;
  width: 180px;
  background-color: white;
  border: 2px solid #409EFF;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 2;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.blueprint-node:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.2);
}

.node-selected {
  border-color: #67C23A;
  background-color: #f0f9eb;
}

.node-title {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-description {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}



/* SVG relation lines styling */
:deep(.relation-line) {
  transition: all 0.3s ease;
}

:deep(.relation-highlighted) {
  stroke: #67C23A;
  stroke-width: 3;
}

:deep(.relation-dimmed) {
  stroke: #C0C4CC;
  stroke-width: 1;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .blueprint-relations-graph {
    flex-direction: column;
  }
  
  .graph-container {
    height: 400px;
  }
}
</style>
