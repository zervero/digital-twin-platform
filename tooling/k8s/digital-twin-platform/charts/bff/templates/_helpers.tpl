{{/*
BFF subchart helpers. Kept separate from the umbrella's helpers
so this chart can be installed standalone with no surprises.
*/}}

{{- define "bff.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "bff.fullname" -}}
{{- if .Values.nameOverride -}}
{{- .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "bff.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "bff.labels" -}}
helm.sh/chart: {{ include "bff.chart" . }}
{{ include "bff.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: bff
app.kubernetes.io/part-of: digital-twin-platform
{{- end -}}

{{- define "bff.selectorLabels" -}}
app.kubernetes.io/name: {{ include "bff.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Image reference. Tag falls back to .Chart.AppVersion when empty,
which is what the release pipeline bumps. Repository comes from
.Values.image.repository (full path) so callers can use a private
registry without touching this template.
*/}}
{{- define "bff.image" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion -}}
{{- printf "%s:%s" .Values.image.repository $tag -}}
{{- end -}}

{{/* ServiceAccount name. Helm creates the SA when create=true. */}}
{{- define "bff.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "bff.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
