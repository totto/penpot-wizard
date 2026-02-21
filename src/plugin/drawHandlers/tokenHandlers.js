import { TOKEN_TYPES } from '../../types/tokensTypes';

/** Penpot token names: [a-zA-Z0-9_-][a-zA-Z0-9$_-]*(.[a-zA-Z0-9$_-]+)*. Sanitize spaces and invalid chars. */
function toPenpotTokenName(name) {
  let s = String(name ?? '').trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_$.-]/g, '')
    .replace(/^-+|-+$/g, '');
  if (!s || !/^[a-zA-Z0-9_-]/.test(s)) return null;
  return s;
}

export function handleCreateTokensSet(payload) {
  const { name, tokens: tokenList } = payload || {};

  try {
    const tokens = penpot.library?.local?.tokens;
    if (!tokens) {
      throw new Error('Tokens API not available. Design tokens may be disabled in this Penpot instance.');
    }

    const setName = typeof name === 'string' ? name : String(name ?? '');
    if (!setName) {
      throw new Error('Set name is required');
    }

    const setProxy = tokens.addSet(setName);
    const tokenErrors = [];
    let tokensCreated = 0;

    for (const token of tokenList) {
      const type = String(token.type ?? '').trim();
      if (!Object.values(TOKEN_TYPES).includes(type)) {
        tokenErrors.push({ token: token.name, reason: `Type "${token.type}" is not supported` });
        continue;
      }
      const penpotName = toPenpotTokenName(token.name);
      if (!penpotName) {
        tokenErrors.push({ token: token.name, reason: 'Token name must be alphanumeric with optional hyphens, underscores and dots (e.g. brand.primary)' });
        continue;
      }
      try {
        setProxy.addToken(type, penpotName, token.value);
        tokensCreated += 1;
      } catch (err) {
        tokenErrors.push({ token: token.name, reason: err?.message || String(err) });
      }
    }

    const message = tokenErrors.length > 0
      ? `Set "${setName}" created with ${tokensCreated} token(s). ${tokenErrors.length} skipped.`
      : `Set "${setName}" created with ${tokensCreated} token(s).`;

    return {
      success: true,
      message,
      payload: {
        setId: setProxy.id,
        setName,
        tokensCreated,
        ...(tokenErrors.length > 0 && { tokenErrors }),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `createTokensSet failed: ${error instanceof Error ? error.message : String(error)}`,
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function handleApplyTokens(payload) {
  const { shapeIds, assignments } = payload || {};

  try {
    const tokensCatalog = penpot.library?.local?.tokens;
    if (!tokensCatalog) {
      throw new Error('Tokens API not available.');
    }

    const allSets = Array.from(tokensCatalog.sets);
    const activeSets = allSets.filter(s => s.active);
    const inactiveSets = allSets.filter(s => !s.active);
    const orderedSets = [...activeSets, ...inactiveSets];

    const page = penpot.currentPage;
    const shapeProxies = shapeIds
      .map(id => page.getShapeById(id))
      .filter(Boolean);

    if (shapeProxies.length === 0) {
      throw new Error('None of the provided shapeIds were found on the current page.');
    }

    const tokenCache = new Map();
    function findToken(tokenName) {
      if (tokenCache.has(tokenName)) return tokenCache.get(tokenName);
      for (const set of orderedSets) {
        const tokens = Array.from(set.tokens);
        const match = tokens.find(t => t.name === tokenName);
        if (match) {
          tokenCache.set(tokenName, match);
          return match;
        }
      }
      tokenCache.set(tokenName, null);
      return null;
    }

    const results = [];
    for (const { tokenName, attr } of assignments) {
      const tokenProxy = findToken(tokenName);
      if (!tokenProxy) {
        results.push({ tokenName, attr, applied: false, reason: `Token "${tokenName}" not found in any set` });
        continue;
      }
      try {
        for (const shape of shapeProxies) {
          shape.applyToken(tokenProxy, [attr]);
        }
        results.push({ tokenName, attr, applied: true });
      } catch (err) {
        results.push({ tokenName, attr, applied: false, reason: err?.message || String(err) });
      }
    }

    const applied = results.filter(r => r.applied).length;
    const failed = results.filter(r => !r.applied);

    return {
      success: true,
      message: `Applied ${applied}/${assignments.length} token(s) to ${shapeProxies.length} shape(s).`,
      payload: {
        applied,
        total: assignments.length,
        shapesFound: shapeProxies.length,
        ...(failed.length > 0 && { errors: failed }),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `applyTokens failed: ${error instanceof Error ? error.message : String(error)}`,
      payload: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

export function handleGetTokensSets() {
  try {
    const tokensCatalog = penpot.library?.local?.tokens;
    if (!tokensCatalog) {
      throw new Error('Tokens API not available.');
    }

    const allSets = Array.from(tokensCatalog.sets);
    const sets = allSets.map(set => {
      const tokens = Array.from(set.tokens).map(t => ({
        name: t.name,
        type: t.type,
        value: t.value,
      }));
      return {
        setId: set.id,
        name: set.name,
        active: !!set.active,
        tokens,
      };
    });

    return {
      success: true,
      message: `Found ${sets.length} token set(s).`,
      payload: { sets },
    };
  } catch (error) {
    return {
      success: false,
      message: `getTokensSets failed: ${error instanceof Error ? error.message : String(error)}`,
      payload: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

export function handleRemoveTokensSet(payload) {
  const { setId } = payload || {};

  try {
    const tokensCatalog = penpot.library?.local?.tokens;
    if (!tokensCatalog) {
      throw new Error('Tokens API not available.');
    }

    const allSets = Array.from(tokensCatalog.sets);
    const targetSet = allSets.find(s => s.id === setId);
    if (!targetSet) {
      throw new Error(`Token set not found (setId: ${setId || 'n/a'}).`);
    }

    const setName = targetSet.name;
    targetSet.remove();

    return {
      success: true,
      message: `Set "${setName}" removed.`,
      payload: { setId, setName },
    };
  } catch (error) {
    return {
      success: false,
      message: `removeTokensSet failed: ${error instanceof Error ? error.message : String(error)}`,
      payload: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

export function handleModifyTokensSet(payload) {
  const { setId, tokensToModify = [], tokensToRemove = [] } = payload || {};

  try {
    const tokensCatalog = penpot.library?.local?.tokens;
    if (!tokensCatalog) {
      throw new Error('Tokens API not available.');
    }

    const allSets = Array.from(tokensCatalog.sets);
    const targetSet = allSets.find(s => s.id === setId);
    if (!targetSet) {
      throw new Error(`Token set not found (setId: ${setId || 'n/a'}).`);
    }

    const getTokens = () => Array.from(targetSet.tokens);
    const results = { modified: [], removed: [], created: [], errors: [] };

    for (const tokenName of tokensToRemove) {
      const tokens = getTokens();
      const tokenProxy = tokens.find(t => t.name === tokenName);
      if (!tokenProxy) {
        results.errors.push({ tokenName, action: 'remove', reason: `Token "${tokenName}" not found` });
        continue;
      }
      try {
        tokenProxy.remove();
        results.removed.push(tokenName);
      } catch (err) {
        results.errors.push({ tokenName, action: 'remove', reason: err?.message || String(err) });
      }
    }

    for (const mod of tokensToModify) {
      const { name, newName, type, value } = mod;
      const tokens = getTokens();
      const existing = tokens.find(t => t.name === name);

      if (!existing) {
        if (!type || value === undefined) {
          results.errors.push({ tokenName: name, action: 'create', reason: 'type and value are required to create a new token' });
          continue;
        }
        try {
          targetSet.addToken(type, newName || name, value);
          results.created.push(newName || name);
        } catch (err) {
          results.errors.push({ tokenName: name, action: 'create', reason: err?.message || String(err) });
        }
        continue;
      }

      const needsRecreate = value !== undefined || type !== undefined;
      if (needsRecreate) {
        const finalType = type || existing.type;
        const finalValue = value !== undefined ? value : existing.value;
        const finalName = newName || existing.name;
        try {
          existing.remove();
          targetSet.addToken(finalType, finalName, finalValue);
          results.modified.push(finalName);
        } catch (err) {
          results.errors.push({ tokenName: name, action: 'modify', reason: err?.message || String(err) });
        }
      } else if (newName) {
        try {
          existing.name = newName;
          results.modified.push(newName);
        } catch (err) {
          results.errors.push({ tokenName: name, action: 'rename', reason: err?.message || String(err) });
        }
      } else {
        results.errors.push({ tokenName: name, action: 'modify', reason: 'No changes specified' });
      }
    }

    const summary = [
      results.modified.length > 0 && `${results.modified.length} modified`,
      results.created.length > 0 && `${results.created.length} created`,
      results.removed.length > 0 && `${results.removed.length} removed`,
      results.errors.length > 0 && `${results.errors.length} error(s)`,
    ].filter(Boolean).join(', ');

    return {
      success: true,
      message: `Set "${targetSet.name}": ${summary || 'no changes'}.`,
      payload: {
        setId,
        setName: targetSet.name,
        ...results,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `modifyTokensSet failed: ${error instanceof Error ? error.message : String(error)}`,
      payload: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

export function handleActivateTokensSet(payload) {
  const { setId, setName, exclusive = false } = payload || {};

  try {
    const tokens = penpot.library?.local?.tokens;
    if (!tokens) {
      throw new Error('Tokens API not available.');
    }

    const allSets = Array.from(tokens.sets);
    const targetSet = setId
      ? allSets.find(s => s.id === setId)
      : allSets.find(s => s.name === setName);

    if (!targetSet) {
      throw new Error(`Token set not found (setId: ${setId || 'n/a'}, setName: ${setName || 'n/a'}).`);
    }

    const deactivated = [];
    if (exclusive) {
      for (const s of allSets) {
        if (s.id !== targetSet.id && s.active) {
          s.active = false;
          deactivated.push(s.name);
        }
      }
    }

    targetSet.active = true;

    const exclusiveNote = deactivated.length > 0
      ? ` Deactivated ${deactivated.length} other set(s): ${deactivated.join(', ')}.`
      : '';

    return {
      success: true,
      message: `Set "${targetSet.name}" activated.${exclusiveNote}`,
      payload: { setName: targetSet.name, setId: targetSet.id, active: true, deactivated },
    };
  } catch (error) {
    return {
      success: false,
      message: `activateTokensSet failed: ${error instanceof Error ? error.message : String(error)}`,
      payload: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}
