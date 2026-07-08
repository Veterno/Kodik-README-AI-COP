'use strict';

/**
 * Объединяет данные о стеке из нескольких манифестов.
 */
function mergeStacks(stacks) {
  if (!stacks || stacks.length === 0) return null;

  const result = {
    language: [],
    framework: [],
    packageManager: [],
    requirements: [],
    installCommands: [],
    runCommands: [],
    extras: [],
    dockerSupported: false,
    dockerCommands: [],
  };

  stacks.forEach(s => {
    if (s.language && !result.language.includes(s.language)) result.language.push(s.language);
    if (s.framework && !result.framework.includes(s.framework)) result.framework.push(s.framework);
    if (s.packageManager && !result.packageManager.includes(s.packageManager)) result.packageManager.push(s.packageManager);
    
    (s.requirements || []).forEach(r => {
      if (!result.requirements.includes(r)) result.requirements.push(r);
    });
    (s.installCommands || []).forEach(c => {
      if (!result.installCommands.includes(c)) result.installCommands.push(c);
    });
    (s.runCommands || []).forEach(c => {
      if (!result.runCommands.includes(c)) result.runCommands.push(c);
    });
    (s.extras || []).forEach(e => {
      if (!result.extras.includes(e)) result.extras.push(e);
    });

    if (s.dockerSupported) result.dockerSupported = true;
    (s.dockerCommands || []).forEach(c => {
      if (!result.dockerCommands.includes(c)) result.dockerCommands.push(c);
    });
  });

  return {
    language: result.language.join(', ') || null,
    framework: result.framework.join(', ') || null,
    packageManager: result.packageManager.join(', ') || null,
    requirements: result.requirements,
    installCommands: result.installCommands,
    runCommands: result.runCommands,
    extras: result.extras,
    dockerSupported: result.dockerSupported,
    dockerCommands: result.dockerCommands,
  };
}

module.exports = { mergeStacks };
