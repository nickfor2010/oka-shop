// The menu the shop starts with on its very first run. After that, products are managed in Admin → Products.
export const DEFAULT_PRODUCTS = [
  { id: 'classic', en: 'Classic', zh: '原味', price: 380, color: '#F4E2AE', deco: 'vanilla', den: 'Vanilla bean, smooth and rich', dzh: '香草籽，滑順濃郁', status: 'available', sort: 1 },
  { id: 'chocolate', en: 'Chocolate', zh: '巧克力', price: 410, color: '#6A4431', deco: 'shave', den: 'Deep cocoa, silky and mellow', dzh: '濃郁可可，絲滑柔和', status: 'available', sort: 2 },
  { id: 'berry', en: 'Mixed Berry', zh: '綜合野莓', price: 410, color: '#8C3A5E', deco: 'berries', den: 'Sweet and tart wild berries', dzh: '酸甜野莓，清爽解膩', status: 'available', sort: 3 },
  { id: 'lemon', en: 'Lemon', zh: '檸檬', price: 410, color: '#F2D54C', deco: 'lemon', den: 'Bright lemon curd, fresh and zesty', dzh: '檸檬凝乳，清新微酸', status: 'available', sort: 4 },
  { id: 'biscoff', en: 'Biscoff', zh: '焦糖餅乾', price: 410, color: '#B97540', deco: 'crumbs', den: 'Caramel biscuit crumble on top', dzh: '焦糖餅乾碎，香氣十足', status: 'available', sort: 5 },
  { id: 'caramel', en: 'Caramel Sea Salt', zh: '焦糖海鹽', price: 410, color: '#C88B3A', deco: 'salt', den: 'Salted caramel, sweet and savory', dzh: '海鹽焦糖，甜鹹平衡', status: 'available', sort: 6 },
  { id: 'sesame', en: 'Black Sesame', zh: '黑芝麻', price: 410, color: '#3B3A40', deco: 'sesame', den: 'Toasted black sesame, nutty', dzh: '焙炒黑芝麻，香醇濃厚', status: 'soon', sort: 7 },
  { id: 'strawberry', en: 'Strawberry', zh: '草莓', price: 410, color: '#E36A7B', deco: 'straw', den: 'Fresh strawberry, sweet and bright', dzh: '新鮮草莓，酸甜明亮', status: 'soon', sort: 8 },
];
