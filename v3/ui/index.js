export async function bindUI(context) {
  await Promise.all(['motion','visuals','pen','home','train','report','archive','curator','keyboard','fx','yearcards'].map(async name=>{
    try { const module=await import('./'+name+'.js'); if(typeof module.init==='function') Promise.resolve(module.init(context)).catch(()=>{}); } catch { /* UI modules are optional while design work proceeds. */ }
  }));
}
