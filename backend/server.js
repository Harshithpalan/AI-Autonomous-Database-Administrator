const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/database/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        version(),
        current_database(),
        current_user,
        (SELECT count(*) FROM pg_stat_activity) as active_connections,
        (SELECT count(*) FROM pg_stat_database WHERE datname = current_database()) as database_stats
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/database/performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        n_tup_hot_upd
      FROM pg_stat_user_tables
      ORDER BY seq_scan DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/database/queries', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time
      FROM pg_stat_statements
      ORDER BY mean_time DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/autotune/analyze', async (req, res) => {
  try {
    const analysis = await analyzeDatabasePerformance();
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/autotune/apply', async (req, res) => {
  try {
    const { recommendations } = req.body;
    const results = [];

    for (const rec of recommendations) {
      try {
        if (rec.type === 'vacuum') {
          await pool.query(`VACUUM ANALYZE ${rec.table}`);
          results.push({ table: rec.table, status: 'success', action: 'vacuum' });
        } else if (rec.type === 'index') {
          await pool.query(rec.sql);
          results.push({ table: rec.table, status: 'success', action: 'index_created' });
        } else if (rec.type === 'config') {
          await pool.query(`ALTER SYSTEM SET ${rec.parameter} = ${rec.value}`);
          results.push({ parameter: rec.parameter, status: 'success', action: 'config_updated' });
        }
      } catch (error) {
        results.push({ error: rec.table || rec.parameter, status: 'failed', message: error.message });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function analyzeDatabasePerformance() {
  const recommendations = [];

  try {
    const tablesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        n_dead_tup
      FROM pg_stat_user_tables
    `);

    for (const table of tablesResult.rows) {
      if (table.seq_scan > 1000 && table.idx_scan === 0) {
        recommendations.push({
          type: 'index',
          table: table.tablename,
          schema: table.schemaname,
          severity: 'high',
          message: `Table ${table.tablename} has high sequential scans but no indexes`,
          sql: `CREATE INDEX idx_${table.tablename}_id ON ${table.schemaname}.${table.tablename} (id)`
        });
      }

      if (table.n_dead_tup > 10000) {
        recommendations.push({
          type: 'vacuum',
          table: table.tablename,
          schema: table.schemaname,
          severity: 'medium',
          message: `Table ${table.tablename} has ${table.n_dead_tup} dead tuples`,
          sql: `VACUUM ANALYZE ${table.schemaname}.${table.tablename}`
        });
      }
    }

    const configResult = await pool.query(`
      SELECT name, setting, unit, short_desc
      FROM pg_settings
      WHERE name IN ('shared_buffers', 'effective_cache_size', 'work_mem', 'maintenance_work_mem')
    `);

    for (const config of configResult.rows) {
      if (config.name === 'shared_buffers' && parseInt(config.setting) < 128) {
        recommendations.push({
          type: 'config',
          parameter: config.name,
          current_value: config.setting,
          suggested_value: '256MB',
          severity: 'medium',
          message: `Consider increasing shared_buffers from ${config.setting} to 256MB`
        });
      }
    }

  } catch (error) {
    console.error('Analysis error:', error);
  }

  return {
    timestamp: new Date().toISOString(),
    recommendations,
    summary: {
      total: recommendations.length,
      high: recommendations.filter(r => r.severity === 'high').length,
      medium: recommendations.filter(r => r.severity === 'medium').length,
      low: recommendations.filter(r => r.severity === 'low').length
    }
  };
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
