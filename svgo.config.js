/**
 * SVGO Configuration for Icon Optimization
 *
 * This configuration optimizes SVG icons for production use:
 * - Removes unnecessary metadata and attributes
 * - Converts colors to currentColor for theming
 * - Preserves viewBox for responsive scaling
 * - Target: < 2KB per icon
 *
 * Usage:
 * npx svgo --config=svgo.config.js -f icon/
 * npx svgo --config=svgo.config.js icon/master.svg
 *
 * @see https://github.com/svg/svgo
 */
module.exports = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Preserve viewBox for responsive scaling
          removeViewBox: false,
          // Remove width/height to allow size control via props
          removeDimensions: true,
        },
      },
    },
    {
      name: 'convertColors',
      params: {
        // Convert all colors to currentColor for theme support
        currentColor: true,
      },
    },
    {
      name: 'removeAttrs',
      params: {
        // Remove attributes that interfere with styling
        attrs: ['class', 'id', 'data-*', 'fill'],
      },
    },
    {
      name: 'sortAttrs',
      params: {
        // Sort attributes for consistent output
        xmlnsOrder: 'alphabetical',
      },
    },
  ],
};
