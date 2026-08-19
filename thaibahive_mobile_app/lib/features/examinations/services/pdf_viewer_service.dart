import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/config/app_config.dart';
import '../../auth/services/token_storage_service.dart';

class PdfViewerService {
  final TokenStorageService _tokenStorage;

  PdfViewerService({TokenStorageService? tokenStorage})
      : _tokenStorage = tokenStorage ?? TokenStorageService();

  Future<File?> downloadReportCardPdf({
    required String examId,
    required String studentId,
    String? dobPassword,
  }) async {
    try {
      final token = await _tokenStorage.getToken();
      final uri = Uri.parse(
        '${AppConfig.apiBaseUrl}/examinations/report-cards/download?examId=$examId&studentId=$studentId${dobPassword != null ? '&password=$dobPassword' : ''}',
      );

      final response = await http.get(
        uri,
        headers: {'Authorization': 'Bearer ${token ?? ''}'},
      );

      if (response.statusCode == 200) {
        final dir = await getTemporaryDirectory();
        final file = File('${dir.path}/report_card_${studentId}_$examId.pdf');
        await file.writeAsBytes(response.bodyBytes);
        return file;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<void> openPdfFile(File file) async {
    await OpenFilex.open(file.path);
  }
}
