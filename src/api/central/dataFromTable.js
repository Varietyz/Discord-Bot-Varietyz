const db = require('../../modules/utils/essentials/dbUtils'); 

async function fetchDataFromTable(table, filters = {}) {
    let query = `SELECT * FROM ${table}`;
    const params = [];

    if (Object.keys(filters).length > 0) {
        query +=
      ' WHERE ' +
      Object.keys(filters)
          .map((key) => {
              params.push(filters[key]);
              return `${key} = ?`;
          })
          .join(' AND ');
    }

    try {
        const data = await db.getAll(query, params);
        return data;
    } catch (err) {
        throw new Error(`Failed to fetch data from ${table}: ${err.message}`);
    }
}

module.exports = {
    fetchDataFromTable,
};
