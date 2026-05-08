import type { Response } from 'express';

export class LoanFormatter {
  static respondHtml(res: Response, html: string): void {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  private static personalLoanStyles(): string {
    return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; padding: 30px 50px; }
    .iline { display: inline-block; border-bottom: 1px solid #000; min-width: 100px; vertical-align: bottom; }
    .iline.short { min-width: 50px; }
    .iline.long  { min-width: 160px; }
    .field { display: flex; align-items: flex-end; margin-bottom: 12px; }
    .field .label { white-space: nowrap; flex-shrink: 0; padding-bottom: 2px; }
    .field .line  { flex: 1; border-bottom: 1px solid #000; margin-left: 6px; min-width: 40px; }
    .field .suffix { white-space: nowrap; flex-shrink: 0; margin-left: 6px; padding-bottom: 2px; }
    .field-row { display: flex; gap: 16px; margin-bottom: 12px; }
    .field-row .part { display: flex; align-items: flex-end; flex: 1; }
    .field-row .part .label { white-space: nowrap; flex-shrink: 0; padding-bottom: 2px; }
    .field-row .part .line  { flex: 1; border-bottom: 1px solid #000; margin-left: 6px; min-width: 30px; }
    .page-title { font-size: 13px; font-weight: bold; text-decoration: underline; text-transform: uppercase; text-align: center; margin: 18px 0 20px; }
    .para { margin-bottom: 14px; line-height: 1.8; text-align: justify; }
    .para.indent { text-indent: 24px; }
    .art { font-weight: bold; margin-top: 10px; margin-bottom: 6px; }
    .center-header { text-align: center; margin-bottom: 20px; line-height: 1.8; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 36px; margin-bottom: 16px; }
    .sig-row .sig { width: 45%; text-align: center; font-weight: bold; }
    .exemplaires { font-size: 11px; margin-top: 16px; }
    .exemplaires li { margin-bottom: 3px; list-style: none; }
    @media print { @page { size: A4 portrait; margin: 0; } body { padding: 14mm 18mm; } }`;
  }

  static personalLoanActeHtml(): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Acte d'Engagement d'un Prêt Personnel</title>
  <style>${LoanFormatter.personalLoanStyles()}</style>
</head>
<body>

  <div class="field">
    <span class="label"><strong>NOM :</strong></span>
    <span class="line"></span>
  </div>
  <div class="field">
    <span class="label"><strong>POST NOM :</strong></span>
    <span class="line"></span>
  </div>
  <div class="field">
    <span class="label"><strong>N° COMPTE :</strong></span>
    <span class="line"></span>
  </div>

  <div class="page-title">Acte d'Engagement d'un Prêt Personnel</div>

  <p class="para indent">Je soussigné <span class="iline long"></span></p>

  <div class="field-row">
    <div class="part">
      <span class="label">Matricule N°</span>
      <span class="line"></span>
    </div>
    <div class="part">
      <span class="label">Téléphone n°</span>
      <span class="line"></span>
    </div>
  </div>

  <p class="para">
    Reconnais par le présent acte, avoir contracté un prêt personnel auprès de la Caisse
    Générale d'Epargne du Congo &laquo;&nbsp;CADECO&nbsp;&raquo;/Succursale de Goma,
    d'un montant de <span class="iline"></span> remboursable en
    <span class="iline short"></span> mensualités, suivant le protocole en annexe.
  </p>

  <p class="para">
    M'engage à rembourser lesdites mensualités sur mon salaire mensuel conformément
    au protocole d'accord ci-annexé.
  </p>

  <p class="para">
    Autorise la CADECO à retenir mensuellement sur mon salaire la mensualité convenue
    ci-annexée.
  </p>

  <p style="text-align:right; margin-top:20px; margin-bottom:4px;">
    Ainsi fait à Goma le &nbsp;.......&nbsp;/&nbsp;.......&nbsp;/${year}
  </p>

  <div class="sig-row">
    <div class="sig">VISA DE L'EMPLOYEUR,</div>
    <div class="sig">SIGNATURE DU DEMANDEUR</div>
  </div>

  <ul class="exemplaires">
    <li>1 exemplaire pour le demandeur</li>
    <li>1 exemplaire pour l'employeur</li>
    <li>1 exemplaire pour la CADECO</li>
  </ul>

</body>
</html>`;
  }

  static personalLoanProtocoleHtml(): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Protocole d'Accord</title>
  <style>${LoanFormatter.personalLoanStyles()}</style>
</head>
<body>

  <div class="center-header">
    <p><strong>CAISSE GENERALE D'EPARGNE DU CONGO</strong></p>
    <p style="text-decoration:underline;">SUCCURSALE DE GOMA</p>
    <p style="text-decoration:underline; font-weight:bold; margin-top:6px;">PROTOCOLE D'ACCORD</p>
  </div>

  <p class="para">
    Entre les soussignés&nbsp;: LA CAISSE GENERALE D'EPARGNE DU CONGO
    &laquo;&nbsp;CADECO&nbsp;&raquo;/Succursale de GOMA représentée par son Directeur
    Provincial Monsieur <span class="iline"></span> d'une part,
  </p>

  <div class="field">
    <span class="label">Et Monsieur</span>
    <span class="line"></span>
    <span class="suffix">demeurant à</span>
    <span class="line"></span>
  </div>

  <div class="field">
    <span class="label">Titulaire du compte numéro</span>
    <span class="line"></span>
    <span class="suffix">à la CADECO/Goma d'autre part,</span>
  </div>

  <p class="para" style="margin-top:10px;"><strong>Il est convenu ce qui suit&nbsp;:</strong></p>

  <p class="art">ART.1</p>
  <div class="field"><span class="line"></span></div>

  <p class="art">ART.2 DUREE :</p>
  <div class="field"><span class="label">Durée&nbsp;:</span><span class="line"></span></div>
  <div class="field"><span class="label">Date de début&nbsp;:</span><span class="line"></span></div>
  <div class="field"><span class="label">Echéance&nbsp;:</span><span class="line"></span></div>
  <div class="field"><span class="label">1ère Mensualité&nbsp;:</span><span class="line"></span></div>
  <div class="field"><span class="label">2ème Mensualité&nbsp;:</span><span class="line"></span></div>
  <div class="field"><span class="label">3ème Mensualité&nbsp;:</span><span class="line"></span></div>

  <p class="art">ART.3 INTERETS :</p>
  <div class="field"><span class="label">Taux&nbsp;:</span><span class="line"></span></div>

  <p class="art">ART.4 GARANTIE :</p>
  <p class="para">Le prêt est garanti par <span class="iline long"></span></p>
  <div class="field"><span class="label">Certificat N°</span><span class="line"></span></div>
  <div class="field"><span class="label">Ou</span><span class="line"></span></div>

  <p class="art">ART.5 RETARD DE PAIEMENT :</p>
  <div class="field">
    <span class="label">En cas de retard de paiement, le taux applicable est de</span>
    <span class="line"></span>
  </div>

  <p class="art">ART.6 :</p>
  <p class="para">
    Toute contestation relative à la présente convention sera soumise aux juridictions
    compétentes de la ville de Goma.
  </p>

  <p style="text-align:right; margin-top:20px; margin-bottom:4px;">
    Fait à Goma, le &nbsp;.......&nbsp;/&nbsp;.......&nbsp;/${year}
  </p>

  <div class="sig-row">
    <div class="sig">LE CLIENT,</div>
    <div class="sig">POUR LA CADECO.</div>
  </div>

</body>
</html>`;
  }

  static overdraftHtml(clientName: string, accountNumber: string): string {
    const year = new Date().getFullYear();
    const nextYear = year + 1;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Protocole d'Accord — Découvert</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; padding: 30px 50px; }
    .center-header { text-align: center; margin-bottom: 24px; line-height: 2; }
    .iline { display: inline-block; border-bottom: 1px solid #000; min-width: 80px; vertical-align: bottom; }
    .iline.short { min-width: 40px; }
    .iline.long  { min-width: 180px; }
    .field { display: flex; align-items: flex-end; margin-bottom: 10px; }
    .field .label { white-space: nowrap; flex-shrink: 0; padding-bottom: 2px; }
    .field .line  { flex: 1; border-bottom: 1px solid #000; margin-left: 6px; min-width: 40px; }
    .para { margin-bottom: 14px; line-height: 1.8; text-align: justify; }
    .para.indent { text-indent: 30px; }
    .art { font-weight: bold; margin-top: 14px; margin-bottom: 6px; }
    .dotted-line { border-bottom: 1px dotted #000; margin-bottom: 14px; margin-top: 4px; }
    .prefilled { font-weight: bold; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 40px; }
    .sig-row .sig { width: 45%; text-align: center; font-weight: bold; }
    @media print { @page { size: A4 portrait; margin: 0; } body { padding: 14mm 18mm; } }
  </style>
</head>
<body>

  <div class="center-header">
    <p><strong>CAISSE GENERALE D'EPARGNE DU CONGO</strong></p>
    <p style="text-decoration:underline; font-weight:bold;">SUCCURSALE DE GOMA</p>
    <p style="text-decoration:underline; font-weight:bold; margin-top:4px;">PROTOCOLE D'ACCORD</p>
  </div>

  <p class="para">
    Entre les soussignés&nbsp;: <strong>LA CAISSE GENERALE D'EPARGNE DU CONGO &laquo;&nbsp;CADECO&nbsp;&raquo;</strong>
    en sigle ici représentée par le Directeur Provincial et Chef de Succursale de Goma agissant
    au nom de Monsieur <strong>DUSABE SANGANO Javan</strong>, Directeur Général, d'une part,
  </p>

  <p class="para">
    Et Mr <span class="prefilled">${clientName}</span>, demeurant à GOMA
  </p>

  <p class="para">
    Titulaire du compte numéro <span class="prefilled">${accountNumber}</span>
    à la CADECO&nbsp;/&nbsp;GOMA d'autre part,
  </p>

  <p class="para"><strong>Il est convenu ce qui suit&nbsp;:</strong></p>

  <p class="art">ART.&nbsp;1 &nbsp;<u>MONTANT DU DECOUVERT EN COMPTE&nbsp;:</u></p>
  <p class="para indent">
    La CADECO consent à la cliente qui accepte un découvert en compte de
    <span class="iline long"></span>
    ( USD <span class="iline"></span> )
  </p>

  <p class="art">ART.2 &nbsp;<u>DUREE</u>&nbsp;:</p>
  <p class="para indent">
    Ce découvert lui est consenti pour une durée de
    <span class="iline short"></span> <strong>jours</strong>
    prenant cours à partir du
    <span class="iline short"></span>&nbsp;/&nbsp;<span class="iline short"></span>&nbsp;/${year},
    l'échéance étant fixée au
    <span class="iline short"></span>&nbsp;/&nbsp;<span class="iline short"></span>&nbsp;/<strong>${nextYear}.</strong>
  </p>

  <p class="art">ART.3 &nbsp;<u>INTERETS</u>&nbsp;:</p>
  <p class="para indent">
    Le présent découvert lui est consenti au taux de
    <strong>Deux pourcent et demi</strong> le mois <strong>(2,5%).</strong>
  </p>

  <p class="art">ART&nbsp;4&nbsp;: &nbsp;<u>GARANTIE</u></p>
  <p class="para">
    A la sûreté et garantie de toutes sommes en principal, intérêts et frais dont il se trouverait
    débiteur envers la CADECO par suite de l'utilisation du découvert qui lui est consenti aux
    termes de l'article 1<sup>er</sup>, le client remet à la CADECO qui accepte son certificat
    d'enregistrement&nbsp;n°
  </p>
  <div class="dotted-line"></div>

  <p class="para indent">
    Ayant librement et volontairement consenti au remboursement de la créance lui accordée par
    la CADECO, il déclare expressément avoir autorisé sa créancière, le droit d'hypothéquer
    à son profit, son immeuble ci-haut décrit ainsi que toute autre construction qui y est
    attenante ou qui sera ajoutée par destination ou par incorporation.
  </p>

  <p class="para indent">
    Autorise expressément cette dernière à requérir auprès du Conservateur des Titres Immobiliers
    l'inscription hypothécaire de premier rang sur cet immeuble décrit ci-dessus à concurrence
    de la somme reçue ajoutée des intérêts normaux, de retard ainsi que toute autre charge y
    relative et, jusqu'au paiement intégral.
  </p>

  <p style="text-align:right; margin-top:24px; margin-bottom:4px;">
    Fait à Goma, le &nbsp;.......&nbsp;/&nbsp;.......&nbsp;/${year}
  </p>

  <div class="sig-row">
    <div class="sig">LE CLIENT,</div>
    <div class="sig">POUR LA CADECO.</div>
  </div>

</body>
</html>`;
  }

  static salaryAdvanceHtml(): string {
    const year = new Date().getFullYear();

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Demande d'un Découvert ou d'une Avance en Compte</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #000;
      background: #fff;
      padding: 30px 50px;
    }

    /* ── Header ─────────────────────────────────────────────── */
    .header { text-align: center; margin-bottom: 20px; }
    .header p { line-height: 1.7; }
    .header .branch { text-decoration: underline; font-weight: bold; }
    .header .title {
      font-size: 13px;
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
      margin-top: 10px;
    }

    /* ── Single field: label + fill line on the same row ────── */
    .field {
      display: flex;
      align-items: flex-end;
      margin-bottom: 14px;
    }
    .field .label {
      white-space: nowrap;
      flex-shrink: 0;
      padding-bottom: 2px;
    }
    .field .line {
      flex: 1;
      border-bottom: 1px solid #000;
      margin-left: 6px;
      min-width: 40px;
    }
    .field .suffix {
      white-space: nowrap;
      flex-shrink: 0;
      margin-left: 6px;
      padding-bottom: 2px;
    }

    /* ── Two-part row ───────────────────────────────────────── */
    .field-row {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
    }
    .field-row .part {
      display: flex;
      align-items: flex-end;
      flex: 1;
    }
    .field-row .part.wide { flex: 2; }
    .field-row .part .label {
      white-space: nowrap;
      flex-shrink: 0;
      padding-bottom: 2px;
    }
    .field-row .part .line {
      flex: 1;
      border-bottom: 1px solid #000;
      margin-left: 6px;
      min-width: 30px;
    }

    /* ── Static text (no fill line) ─────────────────────────── */
    .static-line { margin-bottom: 14px; }

    /* ── Extra full-width line ──────────────────────────────── */
    .full-line {
      border-bottom: 1px solid #000;
      margin-bottom: 14px;
    }

    /* ── Date + requester ───────────────────────────────────── */
    .date-line    { text-align: right; margin-top: 16px; margin-bottom: 4px; }
    .requester    { text-align: right; margin-bottom: 20px; }

    /* ── Accord du Chef de Siège ────────────────────────────── */
    .chef-block   { margin-bottom: 28px; font-weight: bold; }

    /* ── Bottom two-column section ──────────────────────────── */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      margin-bottom: 20px;
    }
    .bottom-section .col { width: 46%; }
    .bottom-section .col .col-title { font-weight: bold; margin-bottom: 8px; }
    .bottom-section .col .area {
      border: 1px solid #000;
      min-height: 80px;
    }

    /* ── N.B. ───────────────────────────────────────────────── */
    .nb { font-size: 11px; }
    .nb p { margin-bottom: 4px; }
    .nb ul { margin-left: 20px; }
    .nb ul li { margin-bottom: 2px; }

    /* ── Print: suppress browser date / URL headers ─────────── */
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body { padding: 14mm 18mm; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div style="text-align:left; font-weight:bold; line-height:1.7;">
      <p>CAISSE GENERALE D'EPARGNE</p>
      <p>DU CONGO</p>
      <p class="branch">SUCCURSALE DE GOMA</p>
    </div>
    <p class="title">Demande d'un Découvert ou d'une Avance en Compte</p>
  </div>

  <div class="field">
    <span class="label">JE SOUSSIGNE :</span>
    <span class="line"></span>
  </div>

  <div class="field-row">
    <div class="part wide">
      <span class="label">TITULAIRE DU COMPTE N° :</span>
      <span class="line"></span>
    </div>
    <div class="part">
      <span class="label">Tél.</span>
      <span class="line"></span>
    </div>
  </div>

  <div class="field-row">
    <div class="part wide">
      <span class="label">OPERATEUR ECONOMIQUE : ADRESSE</span>
      <span class="line"></span>
    </div>
    <div class="part">
      <span class="label">Tél.</span>
      <span class="line"></span>
    </div>
  </div>

  <div class="field-row">
    <div class="part wide">
      <span class="label">AGENT DE (ENTREPRISE) :</span>
      <span class="line"></span>
    </div>
    <div class="part">
      <span class="label">N° MATRICULE :</span>
      <span class="line"></span>
    </div>
  </div>

  <div class="static-line">SOLLICITE AUPRES DE LA CADECO SUCCURSALE DE GOMA</div>

  <div class="field">
    <span class="label">UN DECOUVERT D'ORDRE DE :</span>
    <span class="line"></span>
    <span class="suffix">FC / $</span>
  </div>

  <div class="field">
    <span class="label">(</span>
    <span class="line"></span>
    <span class="suffix">)</span>
  </div>

  <div class="field-row">
    <div class="part">
      <span class="label">REMBOURSABLE : EN DATE</span>
      <span class="line"></span>
    </div>
    <div class="part">
      <span class="label">JOURS</span>
      <span class="line"></span>
    </div>
  </div>

  <div class="field">
    <span class="label">TAUX D'INTERETS :</span>
    <span class="line"></span>
  </div>

  <div class="field">
    <span class="label">DATE D'OCTROI :</span>
    <span class="line"></span>
  </div>

  <div class="field">
    <span class="label">DATE DE LA FIN DE L'ECHEANCE :</span>
    <span class="line"></span>
  </div>

  <div class="field">
    <span class="label">GARANTIE OFFERTE :</span>
    <span class="line"></span>
  </div>

  <div class="field">
    <span class="label">MOTIF DE LA DEMANDE DU DECOUVERT :</span>
    <span class="line"></span>
  </div>

  <div class="full-line" style="margin-top: 24px;"></div>

  <div class="date-line">Fait à Goma, le ...... / ....... /${year}</div>
  <div class="requester">Le requérant</div>

  <div class="chef-block">Accord du Chef de Siège</div>

  <div class="bottom-section">
    <div class="col">
      <div class="col-title">AVIS DU SCE COMMERCIAL ET<br/>DU SCE CREDITS</div>
      <div class="area"></div>
    </div>
    <div class="col">
      <div class="col-title">AVAL DE L'EMPOYEUR<br/>(OU SON DELEGUE)</div>
      <div class="area"></div>
    </div>
  </div>

  <div class="nb">
    <p><strong>N.B.</strong> Cette demande doit être remplie en 3 exemplaires dont :</p>
    <ul>
      <li>1 Exemplaire pour la CADECO</li>
      <li>1 Exemplaire pour le requérant</li>
      <li>1 Exemplaire pour l'Employeur</li>
    </ul>
  </div>

</body>
</html>`;
  }
}
