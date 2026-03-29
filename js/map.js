/**
 * Clickable ISO region map using D3.js.
 * Usage: createMap(containerId, geojson, onSelect)
 *        updateMapSelection(iso)
 */

let _mapSvg = null;
let _mapRegions = null;
let _mapProjection = null;

function createMap(containerId, geojson, onSelect) {
  const container = document.getElementById(containerId);
  if (!container || !geojson) return;

  const tooltip = document.getElementById('map-tooltip');
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Clear previous
  d3.select(container).select('svg').remove();

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  _mapSvg = svg;

  // Glow filter
  const defs = svg.append('defs');
  const filter = defs.append('filter').attr('id', 'cyan-glow');
  filter.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'blur');
  const merge = filter.append('feMerge');
  merge.append('feMergeNode').attr('in', 'blur');
  merge.append('feMergeNode').attr('in', 'SourceGraphic');

  const projection = d3.geoAlbersUsa()
    .fitSize([width - 20, height - 20], geojson)
    .translate([width / 2, height / 2]);

  _mapProjection = projection;

  const path = d3.geoPath().projection(projection);

  _mapRegions = svg.selectAll('path')
    .data(geojson.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('fill', d => d.properties.ISO === State.selectedISO ? 'var(--cyan)' : 'var(--bg-surface-2)')
    .attr('fill-opacity', d => d.properties.ISO === State.selectedISO ? 0.6 : 0.4)
    .attr('stroke', 'var(--border)')
    .attr('stroke-width', 1)
    .attr('filter', d => d.properties.ISO === State.selectedISO ? 'url(#cyan-glow)' : 'none')
    .style('cursor', 'pointer')
    .style('transition', 'fill 0.15s, fill-opacity 0.15s')
    .on('mouseenter', function(event, d) {
      if (d.properties.ISO !== State.selectedISO) {
        d3.select(this).attr('fill-opacity', 0.6);
      }
      tooltip.style.display = 'block';
      tooltip.textContent = d.properties.ISO;
    })
    .on('mousemove', function(event) {
      const rect = container.getBoundingClientRect();
      tooltip.style.left = (event.clientX - rect.left + 10) + 'px';
      tooltip.style.top = (event.clientY - rect.top - 20) + 'px';
    })
    .on('mouseleave', function(event, d) {
      if (d.properties.ISO !== State.selectedISO) {
        d3.select(this).attr('fill-opacity', 0.4);
      }
      tooltip.style.display = 'none';
    })
    .on('click', function(event, d) {
      onSelect(d.properties.ISO);
    });
}

function updateMapSelection(iso) {
  if (!_mapRegions) return;

  _mapRegions
    .attr('fill', d => d.properties.ISO === iso ? 'var(--cyan)' : 'var(--bg-surface-2)')
    .attr('fill-opacity', d => d.properties.ISO === iso ? 0.6 : 0.4)
    .attr('filter', d => d.properties.ISO === iso ? 'url(#cyan-glow)' : 'none');
}
