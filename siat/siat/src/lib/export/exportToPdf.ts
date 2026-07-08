import PDFDocument from 'pdfkit';
import { AppDataSource } from '../../db';
import { Asset } from '../../src/entities/Asset.entity';

export async function generatePdf(res: any, year: string, assetId: string) {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();

    const query = AppDataSource.getRepository(Asset).createQueryBuilder('asset')
      .leftJoinAndSelect('asset.testSessions', 'session', 'session.status = :status', { status: 'VALIDATED' })
      .leftJoinAndSelect('session.testType', 'testType')
      .leftJoinAndSelect('session.testResults', 'results')
      .leftJoinAndSelect('results.parameter', 'parameter')
      .leftJoinAndSelect('parameter.criteriaList', 'criteria');
  
    if (assetId) query.andWhere('asset.id = :assetId', { assetId });
    if (year) query.andWhere('session.testYear = :year', { year });
  
    const assets = await query.getMany();

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(25).text('SIAT Assessment Report', { align: 'center' });
    doc.moveDown();

    assets.forEach(asset => {
        doc.fontSize(18).text(`Asset: ${asset.name} (${asset.equipmentType})`);
        doc.moveDown();
        asset.testSessions.forEach(session => {
            doc.fontSize(14).text(`Test: ${session.testType.name}`);
            session.testResults.forEach(r => {
                doc.fontSize(12).text(`- ${r.parameter.name}: ${r.value} (${r.judgement})`);
                if(r.parameter.criteriaList[0]) {
                    doc.fontSize(10).fillColor('gray').text(`  Basis: ${r.parameter.criteriaList[0].judgementBasis}`);
                    doc.fillColor('black');
                }
            });
            doc.moveDown();
        });
        doc.addPage();
    });

    doc.end();
}