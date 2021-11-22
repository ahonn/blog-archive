const format = require('date-fns/format');
const Image = require('@11ty/eleventy-img');
const TailwindCSS = require('eleventy-plugin-tailwindcss');
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const rss = require("@11ty/eleventy-plugin-rss");
const { isAfter } = require('date-fns');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(TailwindCSS);
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(rss);

  eleventyConfig.addPassthroughCopy('assets/css/prism');
  eleventyConfig.addPassthroughCopy('assets/img');
  eleventyConfig.addPassthroughCopy('assets/font');

  eleventyConfig.addLayoutAlias('post', 'layouts/post.njk');

  eleventyConfig.addNunjucksFilter('format', (dateString, formatString) => {
    return format(new Date(dateString), formatString);
  });
  eleventyConfig.addNunjucksFilter('min', (...numbers) => {
    return Math.min.apply(null, numbers);
  });
  eleventyConfig.addFilter("head", (array, n) => {
    if(!Array.isArray(array) || array.length === 0) {
      return [];
    }
    if( n < 0 ) {
      return array.slice(n);
    }
    return array.slice(0, n);
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

  eleventyConfig.addCollection('featured', function (collection) {
    return collection
      .getAll()
      .filter((item) => item.data.featured)
      .sort((a, b) => new Date(a.data.date) - new Date(b.data.date));
  });

  eleventyConfig.addCollection('restPosts', function (collection) {
    return collection
      .getAll()
      .filter((item) => !item.data.featured && item.data.layout === 'post')
      .sort((a, b) => new Date(a.data.date) - new Date(b.data.date));
  });
};
