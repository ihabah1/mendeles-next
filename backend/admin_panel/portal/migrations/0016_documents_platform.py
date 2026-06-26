import secrets

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def seed_document_templates(apps, schema_editor):
    DocumentTemplate = apps.get_model('portal', 'DocumentTemplate')
    templates = [
        {
            'slug': 'quote',
            'doc_type': 'quote',
            'name': 'הצעת מחיר',
            'description': 'הצעת מחיר מקצועית עם פירוט פריטים וסכום כולל',
            'sort_order': 1,
            'fields_schema': [
                {'key': 'client_name', 'label': 'שם הלקוח', 'type': 'text'},
                {'key': 'client_phone', 'label': 'טלפון', 'type': 'text'},
                {'key': 'project_description', 'label': 'תיאור העבודה', 'type': 'textarea'},
                {'key': 'items', 'label': 'פירוט פריטים', 'type': 'textarea'},
                {'key': 'total_amount', 'label': 'סה״כ (₪)', 'type': 'number'},
                {'key': 'valid_until', 'label': 'תוקף ההצעה', 'type': 'text'},
                {'key': 'notes', 'label': 'הערות', 'type': 'textarea'},
            ],
        },
        {
            'slug': 'visit-summary',
            'doc_type': 'visit_summary',
            'name': 'סיכום ביקור',
            'description': 'תיעוד ביקור אצל לקוח — ממצאים, המלצות ופעולות המשך',
            'sort_order': 2,
            'fields_schema': [
                {'key': 'client_name', 'label': 'שם הלקוח', 'type': 'text'},
                {'key': 'visit_date', 'label': 'תאריך ביקור', 'type': 'text'},
                {'key': 'visit_address', 'label': 'כתובת', 'type': 'text'},
                {'key': 'findings', 'label': 'ממצאים', 'type': 'textarea'},
                {'key': 'recommendations', 'label': 'המלצות', 'type': 'textarea'},
                {'key': 'next_steps', 'label': 'פעולות המשך', 'type': 'textarea'},
            ],
        },
        {
            'slug': 'call-summary',
            'doc_type': 'call_summary',
            'name': 'סיכום שיחה',
            'description': 'סיכום שיחה טלפונית או פגישה — נקודות עיקריות והחלטות',
            'sort_order': 3,
            'fields_schema': [
                {'key': 'client_name', 'label': 'שם הלקוח', 'type': 'text'},
                {'key': 'call_date', 'label': 'תאריך שיחה', 'type': 'text'},
                {'key': 'participants', 'label': 'משתתפים', 'type': 'text'},
                {'key': 'summary', 'label': 'סיכום', 'type': 'textarea'},
                {'key': 'decisions', 'label': 'החלטות', 'type': 'textarea'},
                {'key': 'action_items', 'label': 'משימות המשך', 'type': 'textarea'},
            ],
        },
    ]
    for tpl in templates:
        DocumentTemplate.objects.update_or_create(slug=tpl['slug'], defaults=tpl)


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0015_kiosk_owner_phone_price'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BusinessProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('business_name', models.CharField(blank=True, max_length=160, verbose_name='שם העסק')),
                ('trade', models.CharField(choices=[('general', 'כללי'), ('law', 'עורכי דין'), ('real_estate', 'נדל״ן'), ('accounting', 'רואי חשבון'), ('contractor', 'קבלנים / שיפוצים'), ('plumbing', 'אינסטלציה'), ('gardening', 'גינון'), ('other', 'אחר')], default='general', max_length=32, verbose_name='תחום')),
                ('phone', models.CharField(blank=True, max_length=32, verbose_name='טלפון עסק')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='אימייל עסק')),
                ('address', models.CharField(blank=True, max_length=200, verbose_name='כתובת')),
                ('city', models.CharField(blank=True, max_length=80, verbose_name='עיר')),
                ('tax_id', models.CharField(blank=True, max_length=20, verbose_name='ח.פ. / עוסק')),
                ('logo_url', models.URLField(blank=True, max_length=512, verbose_name='לוגו (קישור)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='business_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'פרופיל עסק',
                'verbose_name_plural': 'פרופילי עסקים',
            },
        ),
        migrations.CreateModel(
            name='DocumentTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(max_length=40, unique=True)),
                ('doc_type', models.CharField(choices=[('quote', 'הצעת מחיר'), ('visit_summary', 'סיכום ביקור'), ('call_summary', 'סיכום שיחה')], max_length=32)),
                ('name', models.CharField(max_length=120, verbose_name='שם')),
                ('description', models.TextField(blank=True, verbose_name='תיאור')),
                ('fields_schema', models.JSONField(blank=True, default=list, verbose_name='שדות')),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'תבנית מסמך',
                'verbose_name_plural': 'תבניות מסמכים',
                'ordering': ['sort_order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Document',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_number', models.CharField(max_length=32, unique=True, verbose_name='מספר מסמך')),
                ('doc_type', models.CharField(choices=[('quote', 'הצעת מחיר'), ('visit_summary', 'סיכום ביקור'), ('call_summary', 'סיכום שיחה')], max_length=32)),
                ('title', models.CharField(max_length=200, verbose_name='כותרת')),
                ('status', models.CharField(choices=[('draft', 'טיוטה'), ('sent', 'נשלח'), ('viewed', 'נצפה'), ('signed', 'נחתם'), ('cancelled', 'בוטל')], db_index=True, default='draft', max_length=20)),
                ('recipient_name', models.CharField(blank=True, max_length=120, verbose_name='שם נמען')),
                ('recipient_email', models.EmailField(blank=True, max_length=254, verbose_name='אימייל נמען')),
                ('recipient_phone', models.CharField(blank=True, max_length=32, verbose_name='טלפון נמען')),
                ('fields_data', models.JSONField(blank=True, default=dict, verbose_name='נתוני שדות')),
                ('notes', models.TextField(blank=True, verbose_name='הערות פנימיות')),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('signed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to=settings.AUTH_USER_MODEL)),
                ('template', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='documents', to='portal.documenttemplate')),
            ],
            options={
                'verbose_name': 'מסמך',
                'verbose_name_plural': 'מסמכים',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SignatureRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.CharField(db_index=True, max_length=64, unique=True)),
                ('status', models.CharField(choices=[('pending', 'ממתין'), ('viewed', 'נצפה'), ('signed', 'נחתם'), ('expired', 'פג תוקף')], default='pending', max_length=20)),
                ('signature_data', models.TextField(blank=True, verbose_name='חתימה')),
                ('viewed_at', models.DateTimeField(blank=True, null=True)),
                ('signed_at', models.DateTimeField(blank=True, null=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('document', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='signature_request', to='portal.document')),
            ],
            options={
                'verbose_name': 'בקשת חתימה',
                'verbose_name_plural': 'בקשות חתימה',
            },
        ),
        migrations.RunPython(seed_document_templates, migrations.RunPython.noop),
    ]
