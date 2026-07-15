"""
Export service for generating comparison reports.
"""
import io
from datetime import datetime
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment
import csv
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


class ExportService:
    """Generate and export comparison reports."""
    
    @staticmethod
    def export_to_excel(comparison_result, file_info1, file_info2):
        """
        Export comparison results to Excel workbook.
        
        Returns:
            io.BytesIO: Excel file buffer
        """
        workbook = openpyxl.Workbook()
        
        # Remove default sheet
        if 'Sheet' in workbook.sheetnames:
            workbook.remove(workbook['Sheet'])
        
        # Create worksheets
        ExportService._create_summary_sheet(workbook, comparison_result, file_info1, file_info2)
        ExportService._create_column_deviations_sheet(workbook, comparison_result)
        ExportService._create_matched_rows_sheet(workbook, comparison_result)
        ExportService._create_unmatched_sheet(workbook, comparison_result)
        ExportService._create_differences_sheet(workbook, comparison_result)
        
        # Write to buffer
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        
        return buffer
    
    @staticmethod
    def _create_summary_sheet(workbook, comparison_result, file_info1, file_info2):
        """Create summary worksheet."""
        ws = workbook.create_sheet('Summary', 0)
        
        # Header styling
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF')
        
        # Title
        ws['A1'] = 'UAT Data Comparison Report'
        ws['A1'].font = Font(bold=True, size=14)
        ws.merge_cells('A1:D1')
        
        # File information
        ws['A3'] = 'File 1 (Developer Upload)'
        ws['A3'].font = Font(bold=True)
        ws['A4'] = f"Name: {file_info1.get('filename', 'N/A')}"
        ws['A5'] = f"Size: {file_info1.get('size', 0) / 1024:.2f} KB"
        ws['A6'] = f"Uploaded: {file_info1.get('uploaded_at', 'N/A')}"

        ws['A8'] = 'File 2 (Client Upload)'
        ws['A8'].font = Font(bold=True)
        ws['A9'] = f"Name: {file_info2.get('filename', 'N/A')}"
        ws['A10'] = f"Size: {file_info2.get('size', 0) / 1024:.2f} KB"
        ws['A11'] = f"Uploaded: {file_info2.get('uploaded_at', 'N/A')}"
        
        # Statistics
        stats = comparison_result.get('statistics', {})
        ws['A13'] = 'Comparison Statistics'
        ws['A13'].font = Font(bold=True)
        
        ws['A14'] = 'Metric'
        ws['B14'] = 'Value'
        for row, (key, val) in enumerate(stats.items(), start=15):
            ws[f'A{row}'] = key.replace('_', ' ').title()
            ws[f'B{row}'] = val
        
        # Quality score
        quality_score = comparison_result.get('quality_score', 0)
        ws['A24'] = 'Overall Quality Score'
        ws['A24'].font = Font(bold=True)
        ws['B24'] = f"{quality_score}%"
        
        # Set column widths
        ws.column_dimensions['A'].width = 30
        ws.column_dimensions['B'].width = 20

    @staticmethod
    def _create_column_deviations_sheet(workbook, comparison_result):
        """Create schema/column deviations worksheet."""
        ws = workbook.create_sheet('Column Deviations')

        deviations = comparison_result.get('headers', {}).get('column_deviations', [])

        ws['A1'] = 'Column'
        ws['B1'] = 'Type'
        ws['C1'] = 'PySpark'
        ws['D1'] = 'SAS'
        ws['E1'] = 'Detail'
        for cell in ('A1', 'B1', 'C1', 'D1', 'E1'):
            ws[cell].font = Font(bold=True)

        for idx, dev in enumerate(deviations, start=2):
            ws[f'A{idx}'] = dev.get('column')
            ws[f'B{idx}'] = dev.get('type')
            ws[f'C{idx}'] = dev.get('pyspark')
            ws[f'D{idx}'] = dev.get('sas')
            ws[f'E{idx}'] = dev.get('detail')

        for col in ['A', 'B', 'C', 'D', 'E']:
            ws.column_dimensions[col].width = 25

    @staticmethod
    def _create_matched_rows_sheet(workbook, comparison_result):
        """Create matched rows worksheet."""
        ws = workbook.create_sheet('Matched Rows')
        
        matched_rows = comparison_result.get('rows', {}).get('matched_rows', [])
        
        # Headers
        ws['A1'] = 'File 1 Row'
        ws['B1'] = 'File 2 Row'
        ws['C1'] = 'Similarity'
        ws['D1'] = 'Differences'
        
        # Data
        for idx, row in enumerate(matched_rows, start=2):
            ws[f'A{idx}'] = row.get('file1_row')
            ws[f'B{idx}'] = row.get('file2_row')
            ws[f'C{idx}'] = row.get('similarity')
            ws[f'D{idx}'] = len(row.get('differences', []))
        
        # Set column widths
        for col in ['A', 'B', 'C', 'D']:
            ws.column_dimensions[col].width = 15
    
    @staticmethod
    def _create_unmatched_sheet(workbook, comparison_result):
        """Create unmatched rows worksheet."""
        ws = workbook.create_sheet('Unmatched')
        
        row_diff = comparison_result.get('rows', {})
        unmatched_f1 = row_diff.get('unmatched_in_file1', [])
        unmatched_f2 = row_diff.get('unmatched_in_file2', [])
        
        # File 1 unmatched
        ws['A1'] = 'File 1 - Unmatched Rows'
        ws['A1'].font = Font(bold=True)
        
        for idx, row in enumerate(unmatched_f1, start=2):
            ws[f'A{idx}'] = f"Row {row.get('row_index')}"
        
        # File 2 unmatched
        col_offset = 5
        ws[f'{chr(65 + col_offset)}1'] = 'File 2 - Unmatched Rows'
        ws[f'{chr(65 + col_offset)}1'].font = Font(bold=True)
        
        for idx, row in enumerate(unmatched_f2, start=2):
            ws[f'{chr(65 + col_offset)}{idx}'] = f"Row {row.get('row_index')}"
        
        ws.column_dimensions['A'].width = 30
    
    @staticmethod
    def _create_differences_sheet(workbook, comparison_result):
        """Create detailed differences worksheet."""
        ws = workbook.create_sheet('Differences')
        
        matched_rows = comparison_result.get('rows', {}).get('matched_rows', [])
        
        # Headers
        ws['A1'] = 'File 1 Row'
        ws['B1'] = 'File 2 Row'
        ws['C1'] = 'Column'
        ws['D1'] = 'File 1 Value'
        ws['E1'] = 'File 2 Value'
        
        # Data
        row_idx = 2
        for row in matched_rows:
            for diff in row.get('differences', []):
                ws[f'A{row_idx}'] = row.get('file1_row')
                ws[f'B{row_idx}'] = row.get('file2_row')
                ws[f'C{row_idx}'] = diff.get('column')
                ws[f'D{row_idx}'] = diff.get('file1_value')
                ws[f'E{row_idx}'] = diff.get('file2_value')
                row_idx += 1
        
        # Set column widths
        for col in ['A', 'B', 'C', 'D', 'E']:
            ws.column_dimensions[col].width = 25
    
    @staticmethod
    def export_to_csv(comparison_result, file_info1, file_info2):
        """
        Export summary to CSV format.
        
        Returns:
            str: CSV content
        """
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['UAT Data Comparison Report'])
        writer.writerow([])
        
        # File info
        writer.writerow(['File Information'])
        writer.writerow(['File 1 (Developer):', file_info1.get('original_filename')])
        writer.writerow(['File 2 (Client):', file_info2.get('original_filename')])
        writer.writerow([])
        
        # Statistics
        stats = comparison_result.get('statistics', {})
        writer.writerow(['Statistics'])
        for key, val in stats.items():
            writer.writerow([key.replace('_', ' ').title(), val])
        
        writer.writerow([])
        writer.writerow(['Overall Quality Score:', f"{comparison_result.get('quality_score', 0)}%"])

        return output.getvalue()

    @staticmethod
    def export_to_pdf(comparison_result, file_info1, file_info2):
        """
        Export the comparison summary (statistics + schema deviations) to PDF.

        Returns:
            io.BytesIO: PDF file buffer
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=landscape(A4),
            leftMargin=1.5 * cm, rightMargin=1.5 * cm, topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        )
        styles = getSampleStyleSheet()
        story = [
            Paragraph('UAT Data Comparison Report', styles['Title']),
            Paragraph(
                f"File 1 (PySpark): {file_info1.get('filename', 'N/A')} &nbsp;&nbsp;|&nbsp;&nbsp; "
                f"File 2 (SAS): {file_info2.get('filename', 'N/A')} &nbsp;&nbsp;|&nbsp;&nbsp; "
                f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
                styles['Normal'],
            ),
            Spacer(1, 0.5 * cm),
        ]

        table_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ])

        stats = comparison_result.get('statistics', {})
        summary_rows = [['Metric', 'Value']]
        summary_rows.append(['Total Records Compared', stats.get('total_rows_compared', '—')])
        summary_rows.append(['Matched Records (identical)', stats.get('matched_rows', '—')])
        summary_rows.append(['Records with Differences', stats.get('rows_with_differences', 0)])
        summary_rows.append(['Additional Rows (PySpark only)', stats.get('unmatched_file1', 0)])
        summary_rows.append(['Additional Rows (SAS only)', stats.get('unmatched_file2', 0)])
        summary_rows.append(['Column Match', f"{stats.get('matched_columns', 0)}/{stats.get('total_columns', 0)}"])
        summary_rows.append(['Match Rate', f"{stats.get('match_percentage', 0)}%"])
        summary_rows.append(['Quality Score', f"{comparison_result.get('quality_score', 0)}%"])

        story.append(Paragraph('Summary', styles['Heading2']))
        summary_table = Table(summary_rows, colWidths=[9 * cm, 6 * cm])
        summary_table.setStyle(table_style)
        story.append(summary_table)
        story.append(Spacer(1, 0.6 * cm))

        column_deviations = comparison_result.get('headers', {}).get('column_deviations', [])
        if column_deviations:
            story.append(Paragraph(f'Schema / Column Deviations ({len(column_deviations)})', styles['Heading2']))
            dev_rows = [['Column', 'Type', 'PySpark', 'SAS', 'Detail']]
            for dev in column_deviations:
                dev_rows.append([
                    str(dev.get('column', '')), str(dev.get('type', '')),
                    str(dev.get('pyspark', '')), str(dev.get('sas', '')), str(dev.get('detail', '')),
                ])
            dev_table = Table(dev_rows, colWidths=[3.5 * cm, 3.5 * cm, 3 * cm, 3 * cm, 7 * cm])
            dev_table.setStyle(table_style)
            story.append(dev_table)
            story.append(Spacer(1, 0.6 * cm))

        matched_rows = comparison_result.get('rows', {}).get('matched_rows', [])
        deviated_rows = [r for r in matched_rows if r.get('differences')]
        if deviated_rows:
            story.append(Paragraph(f'Detailed Deviations ({len(deviated_rows)} rows with differences)', styles['Heading2']))
            diff_rows = [['Row (File1)', 'Column', 'PySpark Value', 'SAS Value']]
            for row in deviated_rows:
                for diff in row.get('differences', []):
                    diff_rows.append([
                        str(row.get('file1_row', '') + 1), str(diff.get('column', '')),
                        str(diff.get('file1_value', '')), str(diff.get('file2_value', '')),
                    ])
            diff_table = Table(diff_rows, colWidths=[3 * cm, 5 * cm, 6 * cm, 6 * cm], repeatRows=1)
            diff_table.setStyle(table_style)
            story.append(diff_table)

        doc.build(story)
        buffer.seek(0)
        return buffer

    # Header fill colors, in column order, matching the dashboard's stat card colors.
    DASHBOARD_COLUMNS = [
        ('total',         'Total Files',    'BFBFBF'),
        ('notStarted',    'Not Started',    '9DC3E6'),
        ('issues',        'Issues',         'F4B183'),
        ('inProgress',    'In progress',    'BDD7EE'),
        ('done',          'UAT Done',       'C6E0B4'),
        ('production',    'In Production',  'B4A7D6'),
        ('completionPct', 'Completion %',   'F8CBAD'),
    ]

    @staticmethod
    def export_dashboard_to_excel(overall, business_units):
        """
        Export the landing-page dashboard summary (Overall + per-BU stats) to Excel,
        matching the reference "Sample downloadable report" format.

        Returns:
            io.BytesIO: Excel file buffer
        """
        workbook = openpyxl.Workbook()
        ws = workbook.active
        ws.title = 'Dashboard Summary'

        header_font = Font(bold=True)
        center = Alignment(horizontal='center')

        ws.cell(row=1, column=1, value='')
        for col_idx, (key, label, color) in enumerate(ExportService.DASHBOARD_COLUMNS, start=2):
            cell = ws.cell(row=1, column=col_idx, value=label)
            cell.font = header_font
            cell.alignment = center
            cell.fill = PatternFill(start_color=color, end_color=color, fill_type='solid')

        def _write_row(row_idx, name, stats):
            ws.cell(row=row_idx, column=1, value=name).font = Font(bold=True)
            for col_idx, (key, _label, _color) in enumerate(ExportService.DASHBOARD_COLUMNS, start=2):
                value = stats.get(key, 0)
                if key == 'completionPct':
                    value = f"{value}%"
                cell = ws.cell(row=row_idx, column=col_idx, value=value)
                cell.alignment = center

        _write_row(2, 'Overall', overall)
        row_idx = 3
        for bu in business_units:
            _write_row(row_idx, bu.get('name', ''), bu)
            row_idx += 1

        ws.column_dimensions['A'].width = 24
        for col_idx in range(2, 2 + len(ExportService.DASHBOARD_COLUMNS)):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = 15

        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        return buffer
