// editor.js

let repoRoot = localStorage.getItem('repoRoot') || '';
let recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');

const helpContent = {
  "growth": {
    title: "Growth Parameters Help",
    html: `
      <p>Growth parameters define how long it takes for a plant to mature and how rarity affects speed.</p>
      <p><strong>baseMaturationSeconds</strong>: Time in seconds for common rarity.</p>
      <p><strong>rarityModifiers</strong>: Multiplier for each rarity (lower = faster growth).</p>
      <p>Example template (copy or apply):</p>
      <pre>{
  "baseMaturationSeconds": 45,
  "rarityModifiers": {
    "common": 1.2,
    "uncommon": 0.9,
    "rare": 0.7,
    "heirloom": 0.6,
    "legendary": 0.4
  }
}</pre>
      <p><a href="#" class="help-link" data-context="general-mutation">Learn more about rarity progression → General Mutation Guide</a></p>
    `
  },

  "general-mutation": {
    title: "General Mutation & Rarity Progression",
    html: `
      <p>Rarity is a core progression mechanic in the game.</p>
      <p>Seeds/plants start at <strong>common</strong> and can mutate upward to uncommon → rare → heirloom → legendary.</p>
      <p>Each upgrade should feel rewarding — higher rarity means faster growth, better yields, prettier visuals, higher harvest value.</p>
      <p>Why multiple modifiers?</p>
      <ul>
        <li>Common: slowest/baseline (1.0–1.2) — early game grind</li>
        <li>Uncommon/Rare: noticeably faster (0.6–0.9) — mid-game push</li>
        <li>Heirloom/Legendary: very fast (0.3–0.6) — end-game prestige</li>
      </ul>
      <p>This creates a satisfying curve: early slow, late fast — encouraging mutation hunting.</p>
      <p>Example template (copy or apply):</p>
      <pre>{
  "growth": {
    "baseMaturationSeconds": 45,
    "rarityModifiers": {
      "common": 1.2,
      "uncommon": 0.9,
      "rare": 0.7,
      "heirloom": 0.6,
      "legendary": 0.4
    }
  }
}</pre>
    `
  },

  "harvest-rewards": {
    title: "Harvest Rewards Help",
    html: `
      <p>These values are awarded when the player harvests a mature plant.</p>
      <p><strong>coins</strong>: Base coins gained (can be multiplied by rarity).</p>
      <p><strong>health</strong>: Zone health % increase after harvest.</p>
      <p>Example:</p>
      <pre>{
  "coins": 2,
  "health": 3
}</pre>
      <p>Copy or apply this template to quickly set standard rewards.</p>
    `
  },

  "planting-rules": {
    title: "Planting Rules Help",
    html: `
      <p>These control how the player plants and harvests this entity.</p>
      <p><strong>energyCost</strong>: Energy required to plant one.</p>
      <p><strong>soilAmendments</strong>: Required soil/clay/fertilizer amounts.</p>
      <p><strong>minMaturityToHarvest</strong>: Earliest stage you can harvest.</p>
      <p><strong>harvestRemovesPlant</strong>: If true, plant is removed after harvest.</p>
      <p><strong>canRegrow / regrowDelay</strong>: If canRegrow is true, plant regrows after delay (hours).</p>
      <p>Example template:</p>
      <pre>{
  "planting": {
    "energyCost": 8,
    "soilAmendments": {
      "sand": 1,
      "clay": 0,
      "fertilizer": 0
    },
    "minMaturityToHarvest": "stage-3",
    "harvestRemovesPlant": true,
    "canRegrow": false,
    "regrowDelay": null
  }
}</pre>
      <p>Copy or apply to set common planting rules.</p>
    `
  }
};

function showError(msg) {
  const el = document.getElementById('error');
  if (el) el.textContent = msg;
  const success = document.getElementById('success');
  if (success) success.textContent = '';
}

function showSuccess(msg) {
  const el = document.getElementById('success');
  if (el) el.textContent = msg;
  const error = document.getElementById('error');
  if (error) error.textContent = '';
  setTimeout(() => {
    if (el) el.textContent = '';
  }, 4000);
}

function updateRootStatus() {
  const status = document.getElementById('root-status');
  if (status) {
    status.textContent = repoRoot
      ? `Repo root: ${repoRoot}`
      : 'No repo root set – icon previews disabled';
  }
}

function addToRecent(filename) {
  if (!recentFiles.includes(filename)) {
    recentFiles.unshift(filename);
    if (recentFiles.length > 10) recentFiles.pop();
    localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
    renderRecentFiles();
  }
}

function renderRecentFiles() {
  const container = document.getElementById('recent-files');
  if (!container) return;

  container.innerHTML = '';
  recentFiles.forEach(filename => {
    const div = document.createElement('div');
    div.className = 'recent-item';
    div.textContent = filename;
    div.onclick = () => {
      alert(`Load recent file: ${filename} – not implemented yet`);
    };
    container.appendChild(div);
  });
}

function toggleSections() {
  const category = document.getElementById('entity-category').value;
  const isPlant = category.startsWith('plants/');

  ['growth-section', 'harvest-section', 'planting-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isPlant ? 'block' : 'none';
  });

  const regrowChecked = document.getElementById('planting-regrow')?.checked;
  const delayWrapper = document.getElementById('regrow-delay-wrapper');
  if (delayWrapper) {
    delayWrapper.style.display = regrowChecked ? 'block' : 'none';
  }
}

function normalizeIconPath() {
  const input = document.getElementById('temp-icon');
  let val = input.value.trim();

  val = val.replace(/^["']|["']$/g, '');
  val = val.replace(/\\/g, '/');

  const prefixes = [
    'C:/', 'C:\\', '/C:/', 'file:///',
    'assets/entities/', 'assets\\entities\\',
    repoRoot.replace(/\\/g, '/')
  ];
  for (const prefix of prefixes) {
    if (val.toLowerCase().startsWith(prefix.toLowerCase())) {
      val = val.slice(prefix.length);
      break;
    }
  }

  val = val.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
  input.value = val;
  processIconInput();
}

function suggestIconSubfolder() {
  const name = document.getElementById('temp-name').value.trim().toLowerCase();
  if (!name) return;

  let genus = name.split(' ')[0];
  if (genus === 'baby' || genus === 'young') genus = name.split(' ')[1] || 'plant';
  genus = genus.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const icon = document.getElementById('temp-icon');
  let current = icon.value.trim();
  if (!current || !current.includes('/')) {
    const suggested = `plants/natives/${genus}/${current || 'unnamed.png'}`;
    if (confirm(`Suggest path?\n\n${suggested}`)) {
      icon.value = suggested;
      processIconInput();
    }
  }
}

function processIconInput() {
  const path = document.getElementById('temp-icon').value.trim();
  const preview = document.getElementById('icon-preview');
  preview.innerHTML = '';

  if (!path) return;

  let imgSrc = `../assets/entities/${path}`;

  if (!window.location.href.startsWith('http')) {
    if (repoRoot) {
      const root = repoRoot.replace(/\\/g, '/').replace(/\/$/, '');
      imgSrc = `${root}/assets/entities/${path}`.replace(/\/+/g, '/');
    } else {
      preview.innerHTML = '<p style="color:#ff7777;">Repo root required for file:// preview</p>';
      return;
    }
  }

  const img = document.createElement('img');
  img.src = imgSrc;
  img.alt = "Icon preview";
  img.onerror = () => {
    preview.innerHTML = '<p style="color:#ff7777;">Image not found – check path</p>';
  };
  preview.appendChild(img);
}

function addRarityModifierRow(rarity = '', mult = '1.0') {
  const container = document.getElementById('rarity-modifiers-container');
  const row = document.createElement('div');
  row.className = 'rarity-row';
  row.style.cssText = 'display:flex; gap:12px; margin-bottom:8px; align-items:center;';

  const sel = document.createElement('select');
  ['common', 'uncommon', 'rare', 'heirloom', 'legendary'].forEach(r => {
    const opt = document.createElement('option');
    opt.value = r;
    opt.text = r.charAt(0).toUpperCase() + r.slice(1);
    if (r === rarity) opt.selected = true;
    sel.appendChild(opt);
  });




  const inp = document.createElement('input');
  inp.type = 'number';
  inp.step = '0.05';
  inp.min = '0.1';
  inp.value = mult;
  inp.style.width = '120px';

  const del = document.createElement('button');
  del.textContent = 'Remove';
  del.style.cssText = 'background:#c62828; padding:6px 12px;';
  del.onclick = () => {
    row.remove();
    updateJsonPreview();
  };

  row.append(sel, inp, del);
  container.appendChild(row);
  updateJsonPreview();
}

// ─── Growth Stages Management ──────────────────────────────────────────────────

function updateGrowthStages() {
  const stagesInput = document.getElementById('growth-stages');
  const container = document.getElementById('growth-stages-container');
  if (!container || !stagesInput) return;

  let count = Math.max(1, Number(stagesInput.value) || 5);
  stagesInput.value = count; // enforce min

  // Clear existing stages
  const existing = container.querySelectorAll('.growth-stage-row');
  existing.forEach(el => el.remove());

  // Add new rows
  for (let i = 1; i <= count; i++) {
    const row = document.createElement('div');
    row.className = 'growth-stage-row';
    row.style.cssText = 'display:flex; gap:12px; margin-bottom:12px; align-items:center;';

    const label = document.createElement('label');
    label.textContent = `Stage ${i}`;
    label.style.width = '80px';

    const pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.placeholder = `Stage ${i} image path`;
    pathInput.style.flex = '1';
    pathInput.oninput = updateJsonPreview;

    const thumbnail = document.createElement('div');
    thumbnail.style.width = '60px';
    thumbnail.style.height = '60px';
    thumbnail.style.background = '#000';
    thumbnail.style.border = '1px solid #444';
    thumbnail.style.borderRadius = '4px';
    thumbnail.style.overflow = 'hidden';

    const img = document.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    thumbnail.appendChild(img);

    // Update thumbnail on path change
    pathInput.oninput = () => {
      const p = pathInput.value.trim();
      if (p) {
        img.src = `../assets/entities/${p}`;
        img.onerror = () => img.src = '';
      } else {
        img.src = '';
      }
      updateJsonPreview();
    };

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = `Optional label (e.g. Sprout)`;
    nameInput.style.width = '180px';
    nameInput.oninput = updateJsonPreview;

    row.append(label, pathInput, thumbnail, nameInput);
    container.appendChild(row);
  }

  // Update minMaturityToHarvest options
  const maturitySelect = document.getElementById('planting-min-maturity');
  if (maturitySelect) {
    maturitySelect.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const opt = document.createElement('option');
      opt.value = `stage-${i}`;
      opt.textContent = `Stage ${i}`;
      maturitySelect.appendChild(opt);
    }
    const matureOpt = document.createElement('option');
    matureOpt.value = 'mature';
    matureOpt.textContent = 'Mature (final stage)';
    maturitySelect.appendChild(matureOpt);
    maturitySelect.value = `stage-${Math.min(3, count)}`; // default to stage-3 or last
  }

  updateJsonPreview();
}

// Show/hide rarity modifiers based on checkbox
function toggleRarityModifiers() {
  const checkbox = document.getElementById('include-rarity-modifiers');
  const wrapper = document.getElementById('rarity-modifiers-wrapper');
  if (wrapper) {
    wrapper.style.display = checkbox.checked ? 'block' : 'none';
    updateJsonPreview();
  }
}

// ─── Init updates (add to DOMContentLoaded) ────────────────────────────────────

// Inside your existing document.addEventListener('DOMContentLoaded', () => { ... })

// Add these lines after existing bindings

document.getElementById('growth-stages').oninput = updateGrowthStages;
document.getElementById('growth-add-stage').onclick = () => {
  const input = document.getElementById('growth-stages');
  input.value = Number(input.value) + 1;
  updateGrowthStages();
};

document.getElementById('growth-remove-stage').onclick = () => {
  const input = document.getElementById('growth-stages');
  input.value = Math.max(1, Number(input.value) - 1);
  updateGrowthStages();
};

document.getElementById('include-rarity-modifiers').onchange = toggleRarityModifiers;

// Initial call
updateGrowthStages();
toggleRarityModifiers();

function showHelp(key) {
  const data = helpContent[key];
  if (!data) return alert("Help not found");

  document.getElementById('help-title').textContent = data.title;
  document.getElementById('help-content').innerHTML = data.html;

  document.querySelectorAll('#help-content pre').forEach(pre => {
    if (pre.querySelector('.copy-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.onclick = () => {
      navigator.clipboard.writeText(pre.textContent.trim()).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    };
    pre.parentNode.insertBefore(btn, pre.nextSibling);
  });

  if (key === 'growth' || key === 'general-mutation' || key === 'harvest-rewards' || key === 'planting-rules') {
    const pre = document.querySelector('#help-content pre');
    if (pre) {
      const apply = document.createElement('button');
      apply.className = 'apply-btn';
      apply.textContent = 'Apply to Entity';
      apply.onclick = () => applyTemplateToForm(pre.textContent.trim());
      pre.parentNode.appendChild(apply);
    }
  }

  document.querySelectorAll('.help-link').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      showHelp(a.dataset.context);
    };
  });

  document.getElementById('help-overlay').style.display = 'block';
  document.getElementById('help-modal').style.display = 'flex';
}

function closeHelpModal() {
  document.getElementById('help-overlay').style.display = 'none';
  document.getElementById('help-modal').style.display = 'none';
}

function applyTemplateToForm(jsonText) {
  if (!confirm("Apply this template? It will overwrite related fields.")) return;

  try {
    const data = JSON.parse(jsonText);

    if (data.coins !== undefined) document.getElementById('harvest-coins').value = data.coins;
    if (data.health !== undefined) document.getElementById('harvest-health').value = data.health;

    if (data.planting) {
      if (data.planting.energyCost !== undefined) document.getElementById('planting-energy').value = data.planting.energyCost;
      if (data.planting.soilAmendments) {
        document.getElementById('soil-sand').value = data.planting.soilAmendments.sand || 0;
        document.getElementById('soil-clay').value = data.planting.soilAmendments.clay || 0;
        document.getElementById('soil-fertilizer').value = data.planting.soilAmendments.fertilizer || 0;
      }
      if (data.planting.minMaturityToHarvest) document.getElementById('planting-min-maturity').value = data.planting.minMaturityToHarvest;
      if (data.planting.harvestRemovesPlant !== undefined) document.getElementById('planting-removes').checked = data.planting.harvestRemovesPlant;
      if (data.planting.canRegrow !== undefined) {
        document.getElementById('planting-regrow').checked = data.planting.canRegrow;
        document.getElementById('regrow-delay-wrapper').style.display = data.planting.canRegrow ? 'block' : 'none';
      }
      if (data.planting.regrowDelay !== undefined) document.getElementById('planting-regrow-delay').value = data.planting.regrowDelay;
    }

    if (data.growth) {
      // Set stage count first (triggers row generation)
      document.getElementById('growth-stages').value = data.growth.stages || 5;
      updateGrowthStages(); // rebuild rows

      // Convert seconds back to display value (default to hours)
      const seconds = data.growth.baseMaturationSeconds || 60 * 60;
      let displayValue = seconds;
      let unit = 'hours';
      if (seconds % 86400 === 0) { displayValue = seconds / 86400; unit = 'days'; }
      else if (seconds % 3600 === 0) { displayValue = seconds / 3600; unit = 'hours'; }
      else if (seconds % 60 === 0) { displayValue = seconds / 60; unit = 'minutes'; }
      else { displayValue = seconds; unit = 'seconds'; }

      document.getElementById('growth-base-value').value = displayValue;
      document.getElementById('growth-unit').value = unit;

      // Fill visual stages and labels
      const rows = document.querySelectorAll('#growth-stages-container .growth-stage-row');
      (data.growth.visualStages || []).forEach((path, i) => {
        if (rows[i]) {
          const pathInput = rows[i].querySelector('input[type="text"]:nth-child(2)');
          if (pathInput) pathInput.value = path;
          // Update thumbnail
          const thumbnailImg = rows[i].querySelector('img');
          if (thumbnailImg) thumbnailImg.src = `../assets/entities/${path}`;
        }
      });
      (data.growth.labels || []).forEach((label, i) => {
        if (rows[i]) {
          const labelInput = rows[i].querySelector('input[type="text"]:nth-child(4)');
          if (labelInput) labelInput.value = label;
        }
      });

      // Rarity modifiers
      if (data.growth.rarityModifiers) {
        document.getElementById('include-rarity-modifiers').checked = true;
        toggleRarityModifiers();
        const cont = document.getElementById('rarity-modifiers-container');
        cont.innerHTML = '';
        Object.entries(data.growth.rarityModifiers).forEach(([r, m]) => {
          addRarityModifierRow(r, m.toString());
        });
      } else {
        document.getElementById('include-rarity-modifiers').checked = false;
        toggleRarityModifiers();
      }
    }

    toggleSections();
    processIconInput();
    updateJsonPreview();
    showSuccess("Template applied!");
    closeHelpModal();
  } catch (err) {
    showError("Invalid template JSON: " + err.message);
  }
}

function toggleJsonPreview() {
  const checked = document.getElementById('show-json-preview').checked;
  document.getElementById('json-preview-container').style.display = checked ? 'block' : 'none';
  if (checked) updateJsonPreview();
}

function updateJsonPreview() {
  if (!document.getElementById('show-json-preview').checked) return;

  const cat = document.getElementById('entity-category').value;
  const id = document.getElementById('temp-id').value.trim() || 'unnamed';
  const name = document.getElementById('temp-name').value.trim();
  const icon = document.getElementById('temp-icon').value.trim();
  const tooltip = document.getElementById('temp-tooltip').value.trim();

  const obj = {
    type: cat.includes('natives') ? 'native' : (cat.includes('invasives') ? 'invasive' : 'other'),
    name,
    icon,
    coins: Number(document.getElementById('harvest-coins')?.value) || 2,
    health: Number(document.getElementById('harvest-health')?.value) || 3,
    tooltip,
    planting: {
      energyCost: Number(document.getElementById('planting-energy')?.value) || 8,
      soilAmendments: {
        sand: Number(document.getElementById('soil-sand')?.value) || 1,
        clay: Number(document.getElementById('soil-clay')?.value) || 0,
        fertilizer: Number(document.getElementById('soil-fertilizer')?.value) || 0
      },
      minMaturityToHarvest: document.getElementById('planting-min-maturity')?.value || 'stage-3',
      harvestRemovesPlant: document.getElementById('planting-removes')?.checked ?? true,
      canRegrow: document.getElementById('planting-regrow')?.checked ?? false,
      regrowDelay: document.getElementById('planting-regrow-delay')?.value ? Number(document.getElementById('planting-regrow-delay').value) : null
    }
  };

  if (cat.startsWith('plants/')) {
    obj.growth = {
      baseMaturationSeconds: Number(document.getElementById('growth-base')?.value) || 60,
      rarityModifiers: {}
    };
    document.querySelectorAll('.rarity-row').forEach(r => {
      const s = r.querySelector('select');
      const i = r.querySelector('input');
      if (s?.value) obj.growth.rarityModifiers[s.value] = Number(i.value) || 1.0;
    });
  }

  document.getElementById('json-preview').value = JSON.stringify(obj, null, 2);
}

function syncJsonToForm() {
  const txt = document.getElementById('json-preview').value.trim();
  if (!txt) return;

  document.getElementById('json-sync-warning').style.display = 'block';

  try {
    const data = JSON.parse(txt);

    if (data.type) {
      if (data.type === 'native') document.getElementById('entity-category').value = 'plants/natives';
      if (data.type === 'invasive') document.getElementById('entity-category').value = 'plants/invasives';
    }

    if (data.name) document.getElementById('temp-name').value = data.name;
    if (data.icon) document.getElementById('temp-icon').value = data.icon;
    if (data.tooltip) document.getElementById('temp-tooltip').value = data.tooltip;

    if (data.coins) document.getElementById('harvest-coins').value = data.coins;
    if (data.health) document.getElementById('harvest-health').value = data.health;

    if (data.planting) {
      if (data.planting.energyCost) document.getElementById('planting-energy').value = data.planting.energyCost;
      if (data.planting.soilAmendments) {
        document.getElementById('soil-sand').value = data.planting.soilAmendments.sand || 0;
        document.getElementById('soil-clay').value = data.planting.soilAmendments.clay || 0;
        document.getElementById('soil-fertilizer').value = data.planting.soilAmendments.fertilizer || 0;
      }
      if (data.planting.minMaturityToHarvest) document.getElementById('planting-min-maturity').value = data.planting.minMaturityToHarvest;
      document.getElementById('planting-removes').checked = data.planting.harvestRemovesPlant ?? true;
      document.getElementById('planting-regrow').checked = data.planting.canRegrow ?? false;
      document.getElementById('regrow-delay-wrapper').style.display = data.planting.canRegrow ? 'block' : 'none';
      if (data.planting.regrowDelay) document.getElementById('planting-regrow-delay').value = data.planting.regrowDelay;
    }

    if (data.growth) {
      document.getElementById('growth-base').value = data.growth.baseMaturationSeconds || 60;
      const container = document.getElementById('rarity-modifiers-container');
      container.innerHTML = '';
      Object.entries(data.growth.rarityModifiers || {}).forEach(([r, m]) => {
        addRarityModifierRow(r, m.toString());
      });
    }

    toggleSections();
    processIconInput();
  } catch (err) {
    console.warn("JSON sync failed:", err);
  }
}

function saveTemplate() {
  const cat = document.getElementById('entity-category').value;
  let id = document.getElementById('temp-id').value.trim();
  if (!id) {
    const n = document.getElementById('temp-name').value.trim().toLowerCase();
    id = n ? n.replace(/[^a-z0-9 ]/gi, '').replace(/\s+/g, '-') : 'unnamed';
    document.getElementById('temp-id').value = id;
  }

  const obj = {
    type: cat.includes('natives') ? 'native' : (cat.includes('invasives') ? 'invasive' : 'other'),
    name: document.getElementById('temp-name').value.trim(),
    icon: document.getElementById('temp-icon').value.trim(),
    coins: Number(document.getElementById('harvest-coins').value) || 2,
    health: Number(document.getElementById('harvest-health').value) || 3,
    tooltip: document.getElementById('temp-tooltip').value.trim(),
    planting: {
      energyCost: Number(document.getElementById('planting-energy').value) || 8,
      soilAmendments: {
        sand: Number(document.getElementById('soil-sand').value) || 1,
        clay: Number(document.getElementById('soil-clay').value) || 0,
        fertilizer: Number(document.getElementById('soil-fertilizer').value) || 0
      },
      minMaturityToHarvest: document.getElementById('planting-min-maturity').value || 'stage-3',
      harvestRemovesPlant: document.getElementById('planting-removes').checked,
      canRegrow: document.getElementById('planting-regrow').checked,
      regrowDelay: document.getElementById('planting-regrow-delay').value ? Number(document.getElementById('planting-regrow-delay').value) : null
    }
  };

  if (cat.startsWith('plants/')) {
    const baseValue = Number(document.getElementById('growth-base-value')?.value) || 45;
    const unit = document.getElementById('growth-unit')?.value || 'hours';
    let baseSeconds = baseValue;
    switch (unit) {
      case 'minutes': baseSeconds *= 60; break;
      case 'hours': baseSeconds *= 3600; break;
      case 'days': baseSeconds *= 86400; break;
    }

    obj.growth = {
      stages: Number(document.getElementById('growth-stages')?.value) || 5,
      baseMaturationSeconds: baseSeconds,
      visualStages: [],
      labels: []
    };

    // Include rarity modifiers only if checkbox is checked
    if (document.getElementById('include-rarity-modifiers')?.checked) {
      obj.growth.rarityModifiers = {};
      document.querySelectorAll('.rarity-row').forEach(r => {
        const s = r.querySelector('select');
        const i = r.querySelector('input');
        if (s?.value) obj.growth.rarityModifiers[s.value] = Number(i.value) || 1.0;
      });
    }

    // Collect visual stages and labels
    const stageRows = document.querySelectorAll('#growth-stages-container .growth-stage-row');
    stageRows.forEach(row => {
      const pathInput = row.querySelector('input[type="text"]:nth-child(2)'); // second input = path
      const labelInput = row.querySelector('input[type="text"]:nth-child(4)'); // fourth input = label
      if (pathInput) obj.growth.visualStages.push(pathInput.value.trim());
      if (labelInput) obj.growth.labels.push(labelInput.value.trim());
    });
  }

  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${id}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showSuccess(`Template saved as ${id}.json`);
  addToRecent(`${id}.json`);
}

function loadTemplateFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);

      if (data.type === 'native') document.getElementById('entity-category').value = 'plants/natives';
      if (data.type === 'invasive') document.getElementById('entity-category').value = 'plants/invasives';

      document.getElementById('temp-id').value = data.id || '';
      document.getElementById('temp-name').value = data.name || '';
      document.getElementById('temp-icon').value = data.icon || '';
      document.getElementById('temp-tooltip').value = data.tooltip || '';

      if (data.coins) document.getElementById('harvest-coins').value = data.coins;
      if (data.health) document.getElementById('harvest-health').value = data.health;

      if (data.planting) {
        document.getElementById('planting-energy').value = data.planting.energyCost || 8;
        if (data.planting.soilAmendments) {
          document.getElementById('soil-sand').value = data.planting.soilAmendments.sand || 0;
          document.getElementById('soil-clay').value = data.planting.soilAmendments.clay || 0;
          document.getElementById('soil-fertilizer').value = data.planting.soilAmendments.fertilizer || 0;
        }
        if (data.planting.minMaturityToHarvest) document.getElementById('planting-min-maturity').value = data.planting.minMaturityToHarvest;
        document.getElementById('planting-removes').checked = data.planting.harvestRemovesPlant ?? true;
        document.getElementById('planting-regrow').checked = data.planting.canRegrow ?? false;
        document.getElementById('regrow-delay-wrapper').style.display = data.planting.canRegrow ? 'block' : 'none';
        if (data.planting.regrowDelay) document.getElementById('planting-regrow-delay').value = data.planting.regrowDelay;
      }

      if (data.growth) {
        document.getElementById('growth-base').value = data.growth.baseMaturationSeconds || 60;
        const container = document.getElementById('rarity-modifiers-container');
        container.innerHTML = '';
        Object.entries(data.growth.rarityModifiers || {}).forEach(([r, m]) => {
          addRarityModifierRow(r, m.toString());
        });
      }

      toggleSections();
      processIconInput();
      updateJsonPreview();
      showSuccess(`Loaded ${file.name}`);
    } catch (err) {
      showError("Invalid JSON: " + err.message);
    }
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('repo-root').value = repoRoot;
  updateRootStatus();
  renderRecentFiles();

  document.getElementById('save-root').onclick = () => {
    repoRoot = document.getElementById('repo-root').value.trim();
    localStorage.setItem('repoRoot', repoRoot);
    updateRootStatus();
  };

  document.getElementById('entity-category').onchange = () => {
    toggleSections();
    updateJsonPreview();
  };

  const iconInput = document.getElementById('temp-icon');
  iconInput.onpaste = () => setTimeout(normalizeIconPath, 50);
  iconInput.onblur = normalizeIconPath;
  iconInput.oninput = normalizeIconPath;

  document.getElementById('temp-name').onblur = suggestIconSubfolder;

  document.getElementById('add-rarity-modifier').onclick = () => addRarityModifierRow();

  document.querySelectorAll('.help-btn').forEach(btn => {
    btn.onclick = () => showHelp(btn.dataset.context);
  });

  document.getElementById('close-help').onclick = closeHelpModal;
  document.getElementById('help-overlay').onclick = e => {
    if (e.target === e.currentTarget) closeHelpModal();
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeHelpModal();
  });

  document.getElementById('show-json-preview').onchange = toggleJsonPreview;
  document.getElementById('json-preview').oninput = syncJsonToForm;

  document.getElementById('planting-regrow').addEventListener('change', () => {
    const wrapper = document.getElementById('regrow-delay-wrapper');
    if (wrapper) {
      wrapper.style.display = document.getElementById('planting-regrow').checked ? 'block' : 'none';
      updateJsonPreview();
    }
  });

  const inputsToWatch = [
    'temp-id', 'temp-name', 'temp-icon', 'temp-tooltip', 'growth-base',
    'harvest-coins', 'harvest-health', 'planting-energy',
    'soil-sand', 'soil-clay', 'soil-fertilizer',
    'planting-min-maturity', 'planting-removes', 'planting-regrow', 'planting-regrow-delay'
  ];

  inputsToWatch.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.oninput = updateJsonPreview;
      el.onchange = updateJsonPreview;
    }
  });

  document.getElementById('rarity-modifiers-container').addEventListener('input', updateJsonPreview);

  document.getElementById('save-template').onclick = saveTemplate;
  document.getElementById('load-template-btn').onclick = () => {
    document.getElementById('load-template').click();
  };
  document.getElementById('load-template').onchange = loadTemplateFile;

  toggleSections();
  updateJsonPreview();
});