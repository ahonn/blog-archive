const format = require('date-fns/format');
const isAfter = require('date-fns/isAfter');
const Image = require('@11ty/eleventy-img');
const TailwindCSSPlugin = require('eleventy-plugin-tailwindcss');

const year2020 = new Date('2020-12-31');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(TailwindCSSPlugin);
  eleventyConfig.addPassthroughCopy('assets/img');

  eleventyConfig.addLayoutAlias('post', 'layouts/post.njk');

  eleventyConfig.addNunjucksFilter('format', (dateString, formatString) => {
    return format(new Date(dateString), formatString);
  });
  eleventyConfig.addNunjucksFilter('min', (...numbers) => {
    return Math.min.apply(null, numbers);
  });

  eleventyConfig.addNunjucksAsyncShortcode('image', async (src, alt, sizes) => {
    const metadata = await Image(src);
    const imageAttributes = {
      alt,
      sizes,
      loading: 'lazy',
      decoding: 'async',
    };
    return Image.generateHTML(metadata, imageAttributes);
  });

  eleventyConfig.addCollection('displayablePosts', function (collection) {
    return collection
      .getAll()
      .filter((item) => {
        // 只显示 2020 年之后的文章
        const isAfter2020 = isAfter(new Date(item.data.date), year2020);
        return item.data.layout === 'post' && isAfter2020;
      })
      .sort((a, b) => !isAfter(new Date(a.data.date), new Date(b.data.date)));
  });

  console.log(eleventyConfig);
};
