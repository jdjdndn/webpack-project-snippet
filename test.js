const path = require('path')

// console.log(path.extname('ab.vue'));
// console.log(path.basename('ab.vue', '.vue'));

function getRealResource(resource) {
  try {
    resource = decodeURIComponent(resource)
  } catch (error) {
  }
  let index = resource.indexOf('?')
  if (index !== -1) {
    resource = resource.slice(0, index)
  }

  index = resource.indexOf('#')
  if (index !== -1) {
    resource = resource.slice(0, index)
  }
  return resource
}

const resourcePath = getRealResource('/http/history/name?age')
console.log(resourcePath);
const fileExtname = path.extname(resourcePath)
console.log(path.basename(resourcePath, fileExtname));