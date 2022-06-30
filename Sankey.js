var sankey = {
	'initialize': function() {
		// Store the query result
			var query = DA.query.getQuery();
			var queryResult = DA.query.getQueryResult();
		
		// Don't do anything if the query is invalid
			if (Object.keys(query.fields).length === 0 ||
				Object.keys(query.fields.dimension).length === 0 ||
				Object.keys(query.fields.metric).length !== 1) { // If query hasn't been added or if it's invalid
				var container = d3.select('#__da-app-content').append('div')
					.style('color', 'rgba(0, 1, 2, 0.49)')
					.style('width', '100%')
					.style('height', '100%')
					.style('display', 'flex')
					.style('flex-direction', 'column')
					.style('justify-content', 'center')
					.style('align-items', 'center');
				container.append('div')
					.style('font-size', '14px')
					.style('margin-bottom', '3px')
					.text('Invalid Query Settings');
				var message = container.append('div')
					.style('font-size', '12px');
				message.append('span')
					.text('To populate this widget, select one measurement and any number of dimensions.');
				javascriptAbort();  // Garbage meaningless function to get the widget to stop processing
			}
			else if (queryResult.rows === 0) { // If query has no data
				var container = d3.select('#__da-app-content').append('div')
					.style('color', 'rgba(0, 1, 2, 0.49)')
					.style('width', '100%')
					.style('height', '100%')
					.style('display', 'flex')
					.style('flex-direction', 'column')
					.style('justify-content', 'center')
					.style('align-items', 'center');
				container.append('svg')
					.attr('width', '56px')
					.attr('height', '56px')
					.style('margin-bottom', '20px')
					.attr('viewBox', '0 0 20 20')
					.attr('preserveAspectRatio', 'xMidYMid meet')
					.attr('fill', 'rgba(0, 1, 2, 0.2')
					.append('path')
						.attr('d', 'M19 18.33 14.4 13.7a7.68 7.68 0 1 0-.71.71L18.33 19A.5.5 0 0 0 19 18.33Zm-10.38-3a6.66 6.66 0 1 1 6.66-6.66A6.66 6.66 0 0 1 8.66 15.31Z');
				container.append('div')
					.style('font-size', '14px')
					.style('margin-bottom', '3px')
					.text('No Data Available');
				container.append('div')
					.style('font-size', '12px')
					.text('Check data or applied filters');
				javascriptAbort();  // Garbage meaningless function to get the widget to stop processing
			}
		
		// Wrapper function for getting formatted values
			function getFormattedValue(name, value) {
				return new Promise((resolve, reject) => {
					DA.query.getFormattedValue({ 'systemName': name, 'value': value, cb: (err, data) => {
						resolve(data);
					}});
				});
			}

		// Wrapper function for setting design options
			function setDesignOptions(options) {
				DA.widget.customDesignSettings.set(options);
			}

		// Wrapper function for getting design settings
			function getDesignSettings() {
				return new Promise((resolve, reject) => {
					DA.widget.customDesignSettings.get({ cb: (err, params) => {
						resolve(params);
					}});
				});
			}

		// Identify the dimensions
			var dimFields = queryResult.fields.filter(x => x.type == 'dimension');

		// Set the design options
			// Function to generate options for metric formatting
				function metricFormatOptions(value) {
					return [{ 'id': 0, 'label': 'System Default (Slow)' }].concat([',.0f', ',.1f', ',.2f', ',.3s', '$,.0f', '$,.1f', '$,.2f', '$,.3s', ',.0%', ',.1%', ',.2%', ',.3%', ',.4%'].map(f => {
						return { 'id': f, 'label': d3.format(f)(value) + ' (Static example: ' + d3.format(f)(1234.56) + ')' };
					}));
				}

			var options = [
				{ 'type': 'title',
					'displayName': 'General Settings' },
				{ 'type': 'colorPicker',
					'id': 'gradientStart',
					'displayName': 'Gradient start',
					'defaultValue': '#86bcb6' },
				{ 'type': 'colorPicker',
					'id': 'gradientEnd',
					'displayName': 'Gradient end and nodes',
					'defaultValue': '#75a1c7' },
				{ 'type': 'select',
					'id': 'labelLayout',
					'displayName': 'Label layout',
					'options': [{ 'id': 'vertical', 'label': 'Vertical' }, { 'id': 'horizontal', 'label': 'Horizontal' }],
					'defaultValue': 'vertical' },
				{ 'type': 'separator' },
				{ 'type': 'title',
					'displayName': 'Node and Link removal',
					'description': 'Removes nodes and their links for dimension values that equal the entries below. For example, "(none)". To remove blanks, enter "removeBlank".' },
				{ 'type': 'input',
					'id': 'removal1',
					'displayName': 'Removal 1',
					'defaultValue': '' },
				{ 'type': 'input',
					'id': 'removal2',
					'displayName': 'Removal 2',
					'defaultValue': '' },
				{ 'type': 'input',
					'id': 'removal3',
					'displayName': 'Removal 3',
					'defaultValue': '' },
				{ 'type': 'separator' },
				{ 'type': 'title', 
					'displayName': 'Metric Formatting' },
				{ 'type': 'input',
					'id': 'localeDecimal',
					'displayName': 'Decimal point for your locale',
					'defaultValue': '.' },
				{ 'type': 'input',
					'id': 'localeThousands',
					'displayName': 'Thousands separator for your locale',
					'defaultValue': ',' },
				{ 'type': 'input',
					'id': 'localeCurrencyPrefix',
					'displayName': 'Currency prefix for your locale',
					'defaultValue': '$' },
				{ 'type': 'input',
					'id': 'localeCurrencySuffix',
					'displayName': 'Currency suffix for your locale',
					'defaultValue': '' }
			];

			setDesignOptions(options);

		// Get design settings, then set options based on entered locale
			getDesignSettings().then(settings => {
				d3.formatDefaultLocale({
					'decimal': settings.localeDecimal,
					'thousands': settings.localeThousands,
					'grouping': [3],
					'currency': [settings.localeCurrencyPrefix, settings.localeCurrencySuffix],
					'numerals': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
					'percent': '%',
					'minus': '-',
					'nan': 'NaN'
				});

				options = options.concat([
					{ 'type': 'select',
						'id': 'metricFormat',
						'displayName': 'Metric format style',
						'options': metricFormatOptions(d3.mean(queryResult.rows, d => d[dimFields.length].value)),
						'defaultValue': 0 },
					{ 'type': 'select',
						'id': 'percentDecimals',
						'displayName': 'Number of percentage decimals',
						'options': [{ 'id': 0, 'label': '0' }, { 'id': 1, 'label': '1' }, { 'id': 2, 'label': '2' }],
						'defaultValue': 0 }
				]);

				setDesignOptions(options);

		// Get design settings again, then create the widget
				return getDesignSettings();

			}).then(settings => {
				// Set styles
					d3.select('head').append('style')
						.html('body { --gradient-start: ' + settings.gradientStart + '; --gradient-end: ' + settings.gradientEnd + '; }');

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
						.on('mouseover', (event, d) => {
							tooltip.transition()
							.style('opacity', 0.9);
							
							tooltip.selectAll('span')
							.data([
								{ 'class': null, 'text': d3.format('.' + settings.percentDecimals + '%')(d.value / nodes[d.target].value) + ' of ' },
								{ 'class': 'name', 'text': nodes[d.target].name },
								{ 'class': null, 'text': ' came from ' },
								{ 'class': 'name', 'text': nodes[d.source].name }
							])
							.join('span')
								.attr('class', d => d.class)
								.text(d => d.text);
						})
						.on('mousemove', (event, d) => {
							tooltip
							.style('top', event.y + 'px')
							.style('left', () => {
								if (d.target.substring(0, d.target.indexOf('\t')) == dimFields.length - 1) {
									return event.x - 224 + 'px';
								}
								else {
									return event.x + 12 + 'px';
								}
							})
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

					if (settings.labelLayout == 'vertical') {
						labelContainers.filter((x, i) => i > 0)
						.style('flex-direction', 'column')
						.style('align-items', 'flex-end')
						.style('justify-content', 'center');
					}
					else if (settings.labelLayout == 'horizontal') {
						labelContainers.filter((x, i) => i > 0)
						.style('flex-direction', 'row')
						.style('align-items', 'center')
						.style('justify-content', 'flex-end')
						.style('gap', '1em');
					}
					
					labelContainers.append('div')
						.attr('class', 'label name')
						.text(d => d.name);
					
					labelContainers.append('div')
						.attr('class', 'label values')
						.each((d, i, nodes) => {
							if (settings.metricFormat === 0) {
								getFormattedValue(queryResult.fields[dimFields.length].systemName, d.value).then(result => {
									d3.select(nodes[i]).text(result);
								})
							}
							else {
								d3.select(nodes[i]).text(d3.format(settings.metricFormat)(d.value));
							}
						});
				
				// Remove nulled elements
					var toRemove = [settings.removal1, settings.removal2, settings.removal3];
					toRemove = toRemove.filter(x => x !== null && x !== '').map(x => x.replace('removeBlank', ''));

					nodePaths.filter(x => toRemove.includes(x.name)).remove();
					linkPaths.filter(x => toRemove.includes(x.target.substring(x.target.indexOf('\t') + 1))).remove();
					labelContainers.filter(x => toRemove.includes(x.name)).remove();
			});
	}
};
