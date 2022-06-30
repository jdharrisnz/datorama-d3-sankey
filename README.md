# datorama-d3-sankey
Custom widget for Datorama. Creates a Sankey Flow Diagram.

This custom widget transforms supplied data and creates a Sankey Flow Diagram. The input is multiple dimensions linked together by one measurement.

This assumes your measurement is summable, and provides preferences to let you set the number formatting.

![Preview image](image.png)

## Set up and Dependencies
Add `sankey.initialize();` to the JS section of the Custom Widget Editor, and add the below links to the dependencies area (second button at the top left of the Custom Widget Editor).

Script dependencies (must be loaded in this order):
1. `https://d3js.org/d3.v7.min.js`
2. `https://solutions.datorama-res.com/public_storage_solutions/sankey/v1/sankey.js`

Style dependency:
1. `https://solutions.datorama-res.com/public_storage_solutions/sankey/v1/sankey.css`

## Preferences
All preferences are located in the widget's design panel. These include
* gradient and node colours;
* label layout;
* node and link removal; and
* metric formatting.