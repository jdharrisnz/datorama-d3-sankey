var sankey = {
  'initialize': function(num, pct) {
    // Don't do anything if the query is invalid
      var query = DA.query.getQuery();
      if (Object.keys(query.fields).length === 0) {
        d3.select('#__da-app-content')
        .html('<h1>Just add data!</h1><p style="line-height: normal">Add data in your widget settings to start making magic happen.</p>');
        javascriptAbort();  // Garbage meaningless function to get the widget to stop processing
      }
      else if (Object.keys(query.fields.dimension).length === 0 ||
               Object.keys(query.fields.metric).length !== 1) {
        d3.select('#__da-app-content')
        .html('<h1>Invalid data selection.</h1><p style="line-height: normal">Select one measurement and any number of dimensions.</p>');
        javascriptAbort();  // Garbage meaningless function to get the widget to stop processing
      }
    
    // Store the query result
      var queryResult = DA.query.getQueryResult();
    
    // Identify the dimensions
      var dimFields = queryResult.fields.filter(x => x.type == 'dimension');
    
    // Create a list of links
      var links = [];
      var totalName = queryResult.fields[dimFields.length].name;
      
      dimFields.forEach((dim, i) => {
        if (i === 0) {
          Array.from(new Set(queryResult.rows.map(x => x[i].value))).sort().forEach(name => {
            links.push({
              'source': '-1\t' + totalName,
              'target': i + '\t' + name,
              'value': d3.sum(queryResult.rows.filter(x => x[i].value == name).map(x => x[dimFields.length].value))
            });
          });
        }
        else {
          Array.from(new Set(queryResult.rows.map(x => x[i-1].value + '\t' + x[i].value))).sort().forEach(name => {
            var source = name.substring(0, name.indexOf('\t'));
            var target = name.substring(name.indexOf('\t') + 1);
            links.push({
              'source': i - 1 + '\t' + source,
              'target': i + '\t' + target,
              'value': d3.sum(queryResult.rows.filter(x => x[i-1].value == source && x[i].value == target).map(x => x[dimFields.length].value))
            });
          });
        }
      });
    
    // Create a list of nodes
      var nodes = {};
      var firstNodeWidth = 0.2;
      var nodeWidth = firstNodeWidth / 20;
      var nodePadding = 0.05;
      var total = d3.sum(queryResult.rows.map(x => x[dimFields.length].value));
      var maxNodes = 0;
      dimFields.forEach((dim, i) => {
        var setLength = new Set(queryResult.rows.map(x => x[i].value)).size;
        if (setLength > maxNodes) {
          maxNodes = setLength;
        }
      });
      var origin = nodePadding * (maxNodes - 1) / 2;
      function normaliseHeight(height) {
        return height / (1 + nodePadding * (maxNodes - 1));
      }
      
      nodes['-1\t' + totalName] = {
        'name': totalName,
        'value': total,
        'height': normaliseHeight(1),
        'x0': 0,
        'x1': firstNodeWidth,
        'y0': normaliseHeight(origin),
        'y1': normaliseHeight(origin + 1)
      };
      
      dimFields.forEach((dim, dimIndex) => {
        var nameSet = Array.from(new Set(queryResult.rows.map(x => x[dimIndex].value)));
        nameSet.sort().forEach((name, nameIndex) => {
          var value = d3.sum(queryResult.rows.filter(x => x[dimIndex].value == name).map(x => x[dimFields.length].value));
          var height = value / total;
          var x1 = ((dimIndex + 1) / dimFields.length) * (1 - firstNodeWidth) + firstNodeWidth;
          var y0 = origin - nodePadding * (nameSet.length - 1) / 2;
          if (nameIndex !== 0) {
            y0 = y0 + d3.sum(Object.values(nodes).filter(x => x.x1 == x1).map(x => x.height)) + nodePadding * nameIndex;
          }
          
          nodes[dimIndex + '\t' + name] = {
            'name': name,
            'value': value,
            'height': height,
            'x0': x1 - nodeWidth,
            'x1': x1,
            'y0': normaliseHeight(y0),
            'y1': normaliseHeight(y0 + height)
          };
        });
      });
    
    // Draw the nodes and links
      var viewContainer = d3.select('#__da-app-content').append('div')
        .attr('id', 'viewContainer');
      
      var tooltip = viewContainer.append('div')
        .attr('id', 'tooltip')
        .style('opacity', 0);
      
      var svg = viewContainer.append('svg')
        .attr('viewBox', '0 0 1 1')
        .attr('preserveAspectRatio', 'none');
      
      var linearGradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'gradient');
      
      linearGradient.selectAll('stop')
      .data([
        { 'offset': '0%', 'stop-color': 'var(--grad-start)' },
        { 'offset': '100%', 'stop-color': 'var(--grad-end)' }
      ])
      .join('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d['stop-color']);
      
      var nodePaths = svg.selectAll('path.node')
      .data(Object.values(nodes))
      .join('path')
        .attr('id', (d, i) => 'node-' + i)
        .attr('class', 'node')
        .attr('d', d => ['M', d.x0, d.y0, 'L', d.x1, d.y0, 'L', d.x1, d.y1, 'L', d.x0, d.y1, 'z'].join(' '));
      
      var xCurve = (1 - firstNodeWidth - (nodeWidth * dimFields.length)) / dimFields.length * (1 / 2);
      
      var linkPaths = svg.selectAll('path.link')
      .data(links)
      .join('path')
        .attr('class', 'link')
        .attr('d', d => {
          var sourceNode = nodes[d.source];
          var targetNode = nodes[d.target];
          
          var sameSource = links.filter(x => x.source == d.source);
          var y0Adj = normaliseHeight(d3.sum(sameSource.slice(0, sameSource.indexOf(d)).map(x => x.value)) / total);
          
          var sameTarget = links.filter(x => x.target == d.target);
          var y1Adj = normaliseHeight(d3.sum(sameTarget.slice(0, sameTarget.indexOf(d)).map(x => x.value)) / total);
          
          var thisHeight = normaliseHeight(d.value / total);
          
          var path = [];
          path.push(['M', sourceNode.x1, sourceNode.y0 + y0Adj].join(' '));
          path.push(['C', sourceNode.x1 + xCurve, sourceNode.y0 + y0Adj, targetNode.x0 - xCurve, targetNode.y0 + y1Adj, targetNode.x0, targetNode.y0 + y1Adj].join(' '));
          path.push(['V', targetNode.y0 + y1Adj + thisHeight].join(' '));
          path.push(['C', targetNode.x0 - xCurve, targetNode.y0 + y1Adj + thisHeight, sourceNode.x1 + xCurve, sourceNode.y0 + y0Adj + thisHeight, sourceNode.x1, sourceNode.y0 + y0Adj + thisHeight].join(' '));
          return path.join(' ') + 'z';
        })
        .on('mouseover', d => {
          tooltip.transition()
          .style('opacity', 0.9);
          
          tooltip.selectAll('span')
          .data([
            { 'class': null, 'text': pct(d.value / nodes[d.target].value) + ' of ' },
            { 'class': 'name', 'text': nodes[d.target].name },
            { 'class': null, 'text': ' came from ' },
            { 'class': 'name', 'text': nodes[d.source].name }
          ])
          .join('span')
            .attr('class', d => d.class)
            .text(d => d.text);
        })
        .on('mousemove', () => {
          var mouse = d3.mouse(viewContainer.node());
          tooltip
          .style('top', mouse[1] + 'px')
          .style('left', mouse[0] + 12 + 'px');
        })
        .on('mouseout', () => {
          tooltip.transition()
          .style('opacity', 0);
        });
    
    // Create the labels
      function pctStr(value) {
        return value * 100 + '%';
      }
      
      var xShift = (1 - firstNodeWidth - (nodeWidth * dimFields.length)) / dimFields.length;
      
      var labelContainers = viewContainer.selectAll('div.labelContainer')
      .data(Object.values(nodes))
      .join('div')
        .attr('id', (d, i) => 'labelContainer-' + i)
        .attr('class', 'labelContainer')
        .style('top', d => pctStr(d.y0))
        .style('left', (d, i) => {
          if (i === 0) {
            return pctStr(d.x0);
          }
          else {
            return pctStr(d.x0 - xShift);
          }
        })
        .style('width', (d, i) => {
          if (i === 0) {
            return pctStr(d.x1 - d.x0);
          }
          else {
            return pctStr(xShift);
          }
        })
        .style('height', d => pctStr(d.y1 - d.y0));
      
      labelContainers.append('div')
        .attr('class', 'label name')
        .text(d => d.name);
      
      labelContainers.append('div')
        .attr('class', 'label values')
        .text(d => num(d.value));
    
    // Remove nulled elements
      nodePaths.filter(x => nullValues.includes(x.name)).remove();
      linkPaths.filter(x => nullValues.includes(x.target.substring(x.target.indexOf('\t') + 1))).remove();
      labelContainers.filter(x => nullValues.includes(x.name)).remove();
  }
};
